import { getBreakdown, getSummary, getTopLinks } from "@short/analytics";
import {
  and,
  asc,
  eq,
  getDb,
  inArray,
  isNull,
  links,
  lt,
  or,
  organization,
  sql,
  workspaceSettings,
} from "@short/db";
import { interpolateEmail, loadBrandEmailContext } from "./email-copy";
import { sendEmail } from "./email";
import { digestEmailTemplate, type DigestEmailData } from "./email-templates";
import { countNewlyBrokenLinks } from "./link-health";
import { panelUrl } from "./public-url";
import { countryName, deltaPercent } from "./stats";
import { listWorkspaceAlertRecipients } from "./workspace-recipients";

const DAY_MS = 24 * 60 * 60 * 1000;
export const DIGEST_BATCH_SIZE = 200;

/** Monday (UTC) of the week `now` falls in, as `YYYY-MM-DD`: the idempotency key. */
export function digestWeekKey(now = new Date()): string {
  const sinceMonday = (now.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - sinceMonday))
    .toISOString()
    .slice(0, 10);
}

/**
 * Records that this week's digest went out, atomically: true for exactly one caller per
 * workspace and week, false when it was already sent or the digest was switched off.
 */
async function claimDigestWeek(workspaceId: string, weekKey: string): Promise<boolean> {
  const [row] = await getDb()
    .insert(workspaceSettings)
    .values({ workspaceId, digestSentFor: weekKey })
    .onConflictDoUpdate({
      target: workspaceSettings.workspaceId,
      set: { digestSentFor: weekKey },
      setWhere: and(
        eq(workspaceSettings.weeklyDigest, true),
        or(isNull(workspaceSettings.digestSentFor), lt(workspaceSettings.digestSentFor, weekKey)),
      ),
    })
    .returning({ workspaceId: workspaceSettings.workspaceId });
  return Boolean(row);
}

export type DigestRunResult = {
  /** Monday of the week being reported on (the previous full week ends there). */
  weekOf: string;
  considered: number;
  /** Workspaces that got a digest this run. */
  sent: number;
  emails: number;
  /** No clicks in either week and nothing broke: marked done, nothing sent. */
  quiet: number;
  noRecipients: number;
  /** Another run claimed the week first. */
  alreadySent: number;
  /** ClickHouse or mail errors; retried on the next run. */
  failed: number;
  /** More workspaces are waiting; call again. */
  more: boolean;
};

/**
 * `/api/cron/digest`: for every workspace with at least one link and the weekly digest
 * on, emails owners/admins the previous full week (Monday–Sunday, UTC): clicks vs the
 * week before, top 5 links, top countries and links that broke. Idempotent per week via
 * `workspace_settings.digest_sent_for`, so it is safe to run hourly on Mondays or retry.
 */
export async function runWeeklyDigest(
  options: { limit?: number; deadlineMs?: number; now?: Date } = {},
): Promise<DigestRunResult> {
  const now = options.now ?? new Date();
  const weekKey = digestWeekKey(now);
  const to = new Date(`${weekKey}T00:00:00.000Z`);
  const from = new Date(to.getTime() - 7 * DAY_MS);
  const limit = Math.min(Math.max(options.limit ?? DIGEST_BATCH_SIZE, 1), 1000);
  const stopAt = Date.now() + (options.deadlineMs ?? 100_000);
  const db = getDb();

  const candidates = await db
    .select({ id: organization.id, name: organization.name })
    .from(organization)
    .leftJoin(workspaceSettings, eq(workspaceSettings.workspaceId, organization.id))
    .where(
      and(
        sql`exists (select 1 from ${links} where ${links.workspaceId} = ${organization.id})`,
        or(
          isNull(workspaceSettings.workspaceId),
          and(
            eq(workspaceSettings.weeklyDigest, true),
            or(isNull(workspaceSettings.digestSentFor), lt(workspaceSettings.digestSentFor, weekKey)),
          ),
        ),
      ),
    )
    .orderBy(asc(organization.id))
    .limit(limit + 1);

  const result: DigestRunResult = {
    weekOf: weekKey,
    considered: 0,
    sent: 0,
    emails: 0,
    quiet: 0,
    noRecipients: 0,
    alreadySent: 0,
    failed: 0,
    more: candidates.length > limit,
  };
  if (candidates.length === 0) {
    return result;
  }

  const ctx = await loadBrandEmailContext();
  const numbers = new Intl.NumberFormat(ctx.locale);
  const day = (value: Date, withYear: boolean) =>
    value.toLocaleDateString(ctx.locale, {
      day: "numeric",
      month: "short",
      year: withYear ? "numeric" : undefined,
      timeZone: "UTC",
    });
  const fromLabel = day(from, false);
  const toLabel = day(new Date(to.getTime() - DAY_MS), true);

  for (const workspace of candidates.slice(0, limit)) {
    if (Date.now() >= stopAt) {
      result.more = true;
      break;
    }
    result.considered += 1;
    try {
      const scope = { workspaceId: workspace.id, from, to };
      const [summary, topLinks, countries, newlyBroken] = await Promise.all([
        getSummary(scope),
        getTopLinks(scope, 5),
        getBreakdown(scope, "country", 5),
        countNewlyBrokenLinks(workspace.id, from, to),
      ]);
      const quiet = summary.clicks === 0 && summary.previousClicks === 0 && newlyBroken === 0;
      const recipients = quiet ? [] : await listWorkspaceAlertRecipients(workspace.id);

      if (!(await claimDigestWeek(workspace.id, weekKey))) {
        result.alreadySent += 1;
        continue;
      }
      if (quiet) {
        result.quiet += 1;
        continue;
      }
      if (recipients.length === 0) {
        result.noRecipients += 1;
        continue;
      }

      const titles = new Map<string, string | null>();
      if (topLinks.length > 0) {
        const rows = await db
          .select({ id: links.id, title: links.title })
          .from(links)
          .where(and(eq(links.workspaceId, workspace.id), inArray(links.id, topLinks.map((row) => row.linkId))));
        for (const row of rows) {
          titles.set(row.id, row.title);
        }
      }

      const delta = deltaPercent(summary.clicks, summary.previousClicks);
      const change =
        summary.previousClicks === 0
          ? summary.clicks === 0
            ? ctx.copy.digestFlat
            : ctx.copy.digestNew
          : delta === 0
            ? ctx.copy.digestFlat
            : interpolateEmail(delta > 0 ? ctx.copy.digestUp : ctx.copy.digestDown, {
                percent: String(Math.abs(delta)),
              });

      const data: DigestEmailData = {
        workspaceName: workspace.name,
        fromLabel,
        toLabel,
        clicks: numbers.format(summary.clicks),
        visitors: numbers.format(summary.visitors),
        change,
        topLinks: topLinks.map((row) => ({
          label: `${row.hostname}/${row.slug}`,
          hint: titles.get(row.linkId) ?? null,
          clicks: numbers.format(row.clicks),
        })),
        topCountries: countries.map((row) => ({
          label: countryName(row.key, ctx.locale, ctx.copy.digestUnknownCountry),
          clicks: numbers.format(row.clicks),
        })),
        newlyBroken,
        ctaUrl: panelUrl("/dashboard"),
      };
      const email = digestEmailTemplate(data, ctx);
      for (const recipient of recipients) {
        await sendEmail({ to: recipient.email, subject: email.subject, html: email.html, text: email.text });
      }
      result.sent += 1;
      result.emails += recipients.length;
    } catch (error) {
      console.error("weekly digest failed", workspace.id, error);
      result.failed += 1;
    }
  }

  return result;
}

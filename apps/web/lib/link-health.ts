import {
  classifyHealthStatus,
  nextHealthState,
  type HealthProbe,
  type LinkHealthStatus,
  type LinkHealthTransition,
} from "@short/core";
import {
  and,
  asc,
  desc,
  domains,
  eq,
  getDb,
  gt,
  gte,
  inArray,
  isNull,
  links,
  lt,
  or,
  sql,
} from "@short/db";
import { serializeLink } from "./api-serializers";
import { sendBrokenLinksAlerts, type BrokenLinkAlert } from "./health-alerts";
import { shortUrl, type LinkWithDomain } from "./links";
import { SafeHttpError, safeHttpRequest } from "./safe-http";
import { dispatchWebhook } from "./webhooks";

/** Budget for one destination, HEAD and the GET fallback together (plus a small grace). */
const PROBE_TIMEOUT_MS = 8000;
const PROBE_MIN_FALLBACK_MS = 2000;
const PROBE_MAX_REDIRECTS = 5;
/** A link is not re-probed by the cron within this window. */
export const HEALTH_RECHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const HEALTH_BATCH_SIZE = 200;
const HEALTH_CONCURRENCY = 10;

function probeFromError(error: unknown): HealthProbe {
  if (error instanceof SafeHttpError) {
    if (error.failure === "unsafe_url") {
      // Intranet or otherwise non-public destination: not ours to judge.
      return { outcome: "inconclusive", statusCode: null, reason: "blocked" };
    }
    return { outcome: "broken", statusCode: null, reason: error.failure };
  }
  return { outcome: "broken", statusCode: null, reason: "network" };
}

function probeFromStatus(status: number): HealthProbe {
  const outcome = classifyHealthStatus(status);
  return { outcome, statusCode: status, reason: outcome === "broken" ? `http_${status}` : null };
}

/**
 * One health probe: HEAD first, then GET when HEAD failed or answered 404/410/5xx
 * (plenty of servers mishandle HEAD). SSRF-safe, redirects followed up to 5 hops with
 * every hop re-validated; a chain that is still redirecting after that counts as up.
 */
export async function probeDestination(url: string): Promise<HealthProbe> {
  const deadline = Date.now() + PROBE_TIMEOUT_MS;
  let head: HealthProbe;
  try {
    const response = await safeHttpRequest(url, {
      method: "HEAD",
      timeoutMs: PROBE_TIMEOUT_MS,
      maxRedirects: PROBE_MAX_REDIRECTS,
    });
    head = probeFromStatus(response.status);
  } catch (error) {
    head = probeFromError(error);
    // DNS answers do not change between methods, and a blocked host stays blocked.
    if (head.reason === "dns" || head.outcome === "inconclusive") {
      return head;
    }
  }
  if (head.outcome !== "broken") {
    return head;
  }

  try {
    const response = await safeHttpRequest(url, {
      method: "GET",
      timeoutMs: Math.max(PROBE_MIN_FALLBACK_MS, deadline - Date.now()),
      maxRedirects: PROBE_MAX_REDIRECTS,
      // Only the status line matters; the body is never read.
      maxBytes: 0,
    });
    return probeFromStatus(response.status);
  } catch (error) {
    const get = probeFromError(error);
    // Report the more informative of the two failures (a status code beats a timeout).
    return head.statusCode != null ? head : get;
  }
}

type HealthRow = Pick<
  LinkWithDomain,
  | "id"
  | "workspaceId"
  | "destination"
  | "healthStatus"
  | "healthFailures"
  | "healthStatusCode"
  | "brokenSince"
  | "healthCheckedAt"
>;

/**
 * Stores a probe result. Guarded on the destination: if the owner changed it while the
 * probe ran, the edit already reset the health state and this stale verdict is dropped.
 */
async function applyProbe(
  row: HealthRow,
  probe: HealthProbe,
  now: Date,
): Promise<LinkHealthTransition | null> {
  const next = nextHealthState(
    {
      status: row.healthStatus,
      failures: row.healthFailures,
      statusCode: row.healthStatusCode,
      brokenSince: row.brokenSince,
    },
    probe,
    now,
  );
  const [updated] = await getDb()
    .update(links)
    .set({
      healthStatus: next.status,
      healthFailures: next.failures,
      healthStatusCode: next.statusCode,
      brokenSince: next.brokenSince,
      healthCheckedAt: now,
    })
    .where(and(eq(links.id, row.id), eq(links.destination, row.destination)))
    .returning({ id: links.id });
  return updated ? next : null;
}

async function loadLinksWithHosts(ids: string[]): Promise<LinkWithDomain[]> {
  if (ids.length === 0) {
    return [];
  }
  const rows = await getDb()
    .select({ link: links, hostname: domains.hostname })
    .from(links)
    .innerJoin(domains, eq(links.domainId, domains.id))
    .where(inArray(links.id, ids));
  return rows.map((row) => ({ ...row.link, hostname: row.hostname }));
}

function brokenPayload(link: LinkWithDomain, reason: string | null): Record<string, unknown> {
  const resource = serializeLink(link);
  return { ...resource, health: { ...resource.health, reason } };
}

/** `link.broken` webhooks for links that just crossed into `broken`. */
async function announceBroken(workspaceId: string, items: { link: LinkWithDomain; reason: string | null }[]) {
  for (const item of items) {
    await dispatchWebhook(workspaceId, "link.broken", brokenPayload(item.link, item.reason));
  }
}

async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index] as T;
      index += 1;
      await worker(item);
    }
  });
  await Promise.all(lanes);
}

export type HealthRunResult = {
  claimed: number;
  checked: number;
  ok: number;
  broken: number;
  newlyBroken: number;
  inconclusive: number;
  /** Claimed but not started before the deadline; released for the next run. */
  released: number;
  alertsSent: number;
};

/**
 * `/api/cron/link-health`: claims up to `limit` active links whose destination was
 * never checked or not within 6 hours (oldest first, `FOR UPDATE SKIP LOCKED` so two
 * overlapping runs never take the same link), probes them 10 at a time, and records
 * the verdicts. Links that turn broken fire `link.broken` webhooks and, per workspace,
 * one alert email to owners/admins (unless health alerts are switched off).
 */
export async function runHealthChecks(
  options: { limit?: number; deadlineMs?: number } = {},
): Promise<HealthRunResult> {
  const limit = Math.min(Math.max(options.limit ?? HEALTH_BATCH_SIZE, 1), 1000);
  const stopAt = Date.now() + (options.deadlineMs ?? 100_000);
  const db = getDb();
  const now = new Date();
  const staleBefore = new Date(now.getTime() - HEALTH_RECHECK_INTERVAL_MS);

  const claimed = await db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: links.id,
        workspaceId: links.workspaceId,
        destination: links.destination,
        healthStatus: links.healthStatus,
        healthFailures: links.healthFailures,
        healthStatusCode: links.healthStatusCode,
        brokenSince: links.brokenSince,
        healthCheckedAt: links.healthCheckedAt,
      })
      .from(links)
      .where(
        and(
          eq(links.archived, false),
          isNull(links.disabledAt),
          isNull(links.clickLimitReachedAt),
          or(isNull(links.expiresAt), gt(links.expiresAt, now)),
          or(isNull(links.healthCheckedAt), lt(links.healthCheckedAt, staleBefore)),
        ),
      )
      .orderBy(sql`${links.healthCheckedAt} ASC NULLS FIRST`, asc(links.id))
      .limit(limit)
      .for("update", { skipLocked: true });
    if (rows.length > 0) {
      await tx
        .update(links)
        .set({ healthCheckedAt: now })
        .where(inArray(links.id, rows.map((row) => row.id)));
    }
    return rows;
  });

  const result: HealthRunResult = {
    claimed: claimed.length,
    checked: 0,
    ok: 0,
    broken: 0,
    newlyBroken: 0,
    inconclusive: 0,
    released: 0,
    alertsSent: 0,
  };
  const transitions = new Map<string, { id: string; reason: string | null }[]>();
  const unstarted: HealthRow[] = [];

  await runPool(claimed, HEALTH_CONCURRENCY, async (row) => {
    if (Date.now() >= stopAt) {
      unstarted.push(row);
      return;
    }
    try {
      const probe = await probeDestination(row.destination);
      const next = await applyProbe(row, probe, new Date());
      result.checked += 1;
      if (probe.outcome === "inconclusive") {
        result.inconclusive += 1;
      } else if (next?.status === "broken") {
        result.broken += 1;
      } else if (probe.outcome === "ok") {
        result.ok += 1;
      }
      if (next?.becameBroken) {
        result.newlyBroken += 1;
        const list = transitions.get(row.workspaceId) ?? [];
        list.push({ id: row.id, reason: probe.reason });
        transitions.set(row.workspaceId, list);
      }
    } catch (error) {
      console.error("link health probe failed", row.id, error);
    }
  });

  // Hand links the deadline cut off back to the queue with their old timestamp.
  for (const row of unstarted) {
    await db
      .update(links)
      .set({ healthCheckedAt: row.healthCheckedAt })
      .where(and(eq(links.id, row.id), eq(links.healthCheckedAt, now)));
  }
  result.released = unstarted.length;

  for (const [workspaceId, items] of transitions) {
    try {
      const rows = await loadLinksWithHosts(items.map((item) => item.id));
      const reasons = new Map(items.map((item) => [item.id, item.reason]));
      const broken = rows.map((link) => ({ link, reason: reasons.get(link.id) ?? null }));
      await announceBroken(workspaceId, broken);
      const alerts: BrokenLinkAlert[] = broken.map(({ link, reason }) => ({
        shortUrl: shortUrl(link.hostname, link.slug),
        destination: link.destination,
        title: link.title,
        statusCode: link.healthStatusCode,
        reason,
      }));
      result.alertsSent += await sendBrokenLinksAlerts(workspaceId, alerts);
    } catch (error) {
      console.error("link health notifications failed", workspaceId, error);
    }
  }

  return result;
}

export type LinkHealthView = {
  status: LinkHealthStatus;
  statusCode: number | null;
  checkedAt: string | null;
  brokenSince: string | null;
  /** Consecutive failed probes; the link turns broken at 2. */
  failures: number;
  /** Cause of the latest failure (`dns`, `timeout`, `http_404`, ...), null when fine. */
  reason: string | null;
};

/**
 * Manual "check now" from the panel. Uses the same two-strike rule as the cron, except
 * that a broken link recovers on the first good answer. Fires `link.broken` when this
 * check is the one that tips it over. Returns null for a link outside the workspace.
 */
export async function recheckLinkHealth(workspaceId: string, linkId: string): Promise<LinkHealthView | null> {
  const [row] = await getDb()
    .select({ link: links, hostname: domains.hostname })
    .from(links)
    .innerJoin(domains, eq(links.domainId, domains.id))
    .where(and(eq(links.id, linkId), eq(links.workspaceId, workspaceId)))
    .limit(1);
  if (!row) {
    return null;
  }
  const link: LinkWithDomain = { ...row.link, hostname: row.hostname };
  const now = new Date();
  const probe = await probeDestination(link.destination);
  const next = await applyProbe(link, probe, now);
  const state = next ?? {
    status: link.healthStatus,
    failures: link.healthFailures,
    statusCode: link.healthStatusCode,
    brokenSince: link.brokenSince,
    becameBroken: false,
    recovered: false,
  };

  if (next?.becameBroken) {
    const [fresh] = await loadLinksWithHosts([link.id]);
    if (fresh) {
      await announceBroken(workspaceId, [{ link: fresh, reason: probe.reason }]);
    }
  }

  return {
    status: state.status,
    statusCode: state.statusCode,
    checkedAt: next ? now.toISOString() : (link.healthCheckedAt?.toISOString() ?? null),
    brokenSince: state.brokenSince?.toISOString() ?? null,
    failures: state.failures,
    reason: probe.reason,
  };
}

export type BrokenLinkView = {
  id: string;
  slug: string;
  hostname: string;
  shortUrl: string;
  destination: string;
  title: string | null;
  statusCode: number | null;
  brokenSince: string | null;
  checkedAt: string | null;
  archived: boolean;
};

/** Broken links of a workspace, most recently broken first. */
export async function listBrokenLinks(workspaceId: string, limit = 200): Promise<BrokenLinkView[]> {
  const rows = await getDb()
    .select({ link: links, hostname: domains.hostname })
    .from(links)
    .innerJoin(domains, eq(links.domainId, domains.id))
    .where(and(eq(links.workspaceId, workspaceId), eq(links.healthStatus, "broken")))
    .orderBy(desc(links.brokenSince))
    .limit(Math.min(Math.max(limit, 1), 500));
  return rows.map(({ link, hostname }) => ({
    id: link.id,
    slug: link.slug,
    hostname,
    shortUrl: shortUrl(hostname, link.slug),
    destination: link.destination,
    title: link.title,
    statusCode: link.healthStatusCode,
    brokenSince: link.brokenSince?.toISOString() ?? null,
    checkedAt: link.healthCheckedAt?.toISOString() ?? null,
    archived: link.archived,
  }));
}

/**
 * Links of a workspace that are broken now and turned broken in `[since, until)`
 * (weekly digest). `until` defaults to now.
 */
export async function countNewlyBrokenLinks(workspaceId: string, since: Date, until?: Date): Promise<number> {
  const [row] = await getDb()
    .select({ value: sql<number>`count(*)::int` })
    .from(links)
    .where(
      and(
        eq(links.workspaceId, workspaceId),
        eq(links.healthStatus, "broken"),
        gte(links.brokenSince, since),
        until ? lt(links.brokenSince, until) : undefined,
      ),
    );
  return row?.value ?? 0;
}

import { randomBytes } from "node:crypto";
import type { BreakdownRow, Granularity, TimeseriesPoint } from "@short/analytics";
import {
  and,
  count,
  desc,
  domains,
  eq,
  getDb,
  gt,
  isNull,
  links,
  or,
  statsShares,
  type StatsShareRow,
} from "@short/db";
import { z } from "zod";
import { QuotaError } from "./action-result";
import { loadBreakdown, loadSummary, loadTimeseries } from "./analytics";
import { shortUrl } from "./links";
import { panelUrl } from "./public-url";
import { getWorkspacePlan } from "./quota";
import { cacheGet, cacheSet, rateLimit } from "./redis";
import { clampRangeToRetention, resolveRange } from "./stats";

/** Live (not revoked, not expired) shares per link; revoke one to make room. */
export const MAX_ACTIVE_SHARES_PER_LINK = 20;
export const SHARE_RANGE_KEYS = ["24h", "7d", "30d", "90d", "12m", "all"] as const;
export type ShareRangeKey = (typeof SHARE_RANGE_KEYS)[number];
export const DEFAULT_SHARE_RANGE: ShareRangeKey = "30d";

/** Public page views per visitor IP per minute; each uncached view costs ClickHouse queries. */
const SHARE_VIEWS_PER_MINUTE = 60;
const SHARE_STATS_CACHE_SECONDS = 300;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

export const statsShareInputSchema = z.object({
  /** ISO timestamp in the future, or null for a link that lives until revoked. */
  expiresAt: z.coerce
    .date()
    .nullable()
    .default(null)
    .refine((value) => value == null || value.getTime() > Date.now(), { message: "expiresInPast" }),
  showReferrers: z.boolean().default(false),
  showLocations: z.boolean().default(false),
});

export type StatsShareInput = z.input<typeof statsShareInputSchema>;

export type StatsShareView = {
  id: string;
  linkId: string;
  token: string;
  /** Absolute public URL, `${APP_URL}/share/<token>`. */
  url: string;
  createdBy: string | null;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  showReferrers: boolean;
  showLocations: boolean;
  /** Neither revoked nor expired. */
  active: boolean;
};

/** 32 random bytes as base64url: 43 URL-safe characters. */
export function generateShareToken(): string {
  return randomBytes(32).toString("base64url");
}

export function shareUrl(token: string): string {
  return panelUrl(`/share/${token}`);
}

function isActive(row: Pick<StatsShareRow, "revokedAt" | "expiresAt">, now = Date.now()): boolean {
  return row.revokedAt == null && (row.expiresAt == null || row.expiresAt.getTime() > now);
}

function toView(row: StatsShareRow): StatsShareView {
  return {
    id: row.id,
    linkId: row.linkId,
    token: row.token,
    url: shareUrl(row.token),
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    showReferrers: row.showReferrers,
    showLocations: row.showLocations,
    active: isActive(row),
  };
}

async function assertLinkInWorkspace(workspaceId: string, linkId: string): Promise<void> {
  const [row] = await getDb()
    .select({ id: links.id })
    .from(links)
    .where(and(eq(links.id, linkId), eq(links.workspaceId, workspaceId)))
    .limit(1);
  if (!row) {
    throw new Error("Link not found");
  }
}

/** Throws `Error("Link not found")` or `QuotaError("stats_shares")` at 20 live shares. */
export async function createStatsShare(
  workspaceId: string,
  linkId: string,
  createdBy: string | null,
  input: z.output<typeof statsShareInputSchema>,
): Promise<StatsShareView> {
  await assertLinkInWorkspace(workspaceId, linkId);
  const db = getDb();
  const now = new Date();
  const [live] = await db
    .select({ value: count() })
    .from(statsShares)
    .where(
      and(
        eq(statsShares.linkId, linkId),
        isNull(statsShares.revokedAt),
        or(isNull(statsShares.expiresAt), gt(statsShares.expiresAt, now)),
      ),
    );
  if ((live?.value ?? 0) >= MAX_ACTIVE_SHARES_PER_LINK) {
    throw new QuotaError(`A link can have ${MAX_ACTIVE_SHARES_PER_LINK} live share links.`, "stats_shares");
  }

  const [row] = await db
    .insert(statsShares)
    .values({
      workspaceId,
      linkId,
      token: generateShareToken(),
      createdBy,
      expiresAt: input.expiresAt,
      showReferrers: input.showReferrers,
      showLocations: input.showLocations,
    })
    .returning();
  if (!row) {
    throw new Error("Stats share insert returned no row");
  }
  return toView(row);
}

/** Every share of a link, newest first, including revoked and expired ones (max 50). */
export async function listStatsShares(workspaceId: string, linkId: string): Promise<StatsShareView[]> {
  const rows = await getDb()
    .select()
    .from(statsShares)
    .where(and(eq(statsShares.workspaceId, workspaceId), eq(statsShares.linkId, linkId)))
    .orderBy(desc(statsShares.createdAt))
    .limit(50);
  return rows.map((row) => toView(row));
}

/** Returns the revoked share, or null when it is not in this workspace or already revoked. */
export async function revokeStatsShare(workspaceId: string, shareId: string): Promise<StatsShareView | null> {
  const [row] = await getDb()
    .update(statsShares)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(statsShares.id, shareId), eq(statsShares.workspaceId, workspaceId), isNull(statsShares.revokedAt)),
    )
    .returning();
  return row ? toView(row) : null;
}

export type SharedStats = {
  link: {
    title: string | null;
    shortUrl: string;
    hostname: string;
    slug: string;
    /** Host only: query strings (UTM tags, ids) of the destination stay private. */
    destinationHost: string | null;
    createdAt: string;
  };
  range: {
    key: ShareRangeKey;
    from: string;
    to: string;
    granularity: Granularity;
    /** True when the owner's plan retention cut the requested range short. */
    clamped: boolean;
  };
  totals: {
    clicks: number;
    qrScans: number;
    visitors: number;
    previousClicks: number;
    /** Missing from payloads cached before it was added; read it as 0. */
    previousQrScans?: number;
    previousVisitors: number;
  };
  timeseries: TimeseriesPoint[];
  devices: BreakdownRow[];
  browsers: BreakdownRow[];
  /** Null when the share hides locations. */
  countries: BreakdownRow[] | null;
  /** Null when the share hides referrers. */
  referrers: BreakdownRow[] | null;
  share: { expiresAt: string | null; showReferrers: boolean; showLocations: boolean };
  generatedAt: string;
};

export type SharedStatsResult =
  | { status: "ok"; stats: SharedStats }
  | { status: "not_found" }
  | { status: "rate_limited" };

export function parseShareRange(value: string | undefined | null): ShareRangeKey {
  return SHARE_RANGE_KEYS.includes(value as ShareRangeKey) ? (value as ShareRangeKey) : DEFAULT_SHARE_RANGE;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Data for the public `/share/<token>` page. Revoked, expired and unknown tokens, and
 * links disabled by moderation, all come back as `not_found`. The range is clamped to the
 * owner's plan retention exactly like the panel, bots are excluded, and aggregates are
 * cached for 5 minutes per share and range. `ip` (the viewer's) drives the rate limit.
 */
export async function getSharedStats(
  token: string,
  range?: string | null,
  options: { ip?: string | null } = {},
): Promise<SharedStatsResult> {
  if (!TOKEN_PATTERN.test(token)) {
    return { status: "not_found" };
  }
  const limit = await rateLimit(`share-view:${options.ip ?? "unknown"}`, SHARE_VIEWS_PER_MINUTE, 60);
  if (!limit.allowed) {
    return { status: "rate_limited" };
  }

  const [row] = await getDb()
    .select({ share: statsShares, link: links, hostname: domains.hostname })
    .from(statsShares)
    .innerJoin(links, eq(statsShares.linkId, links.id))
    .innerJoin(domains, eq(links.domainId, domains.id))
    .where(eq(statsShares.token, token))
    .limit(1);
  if (!row || !isActive(row.share) || row.link.disabledAt != null) {
    return { status: "not_found" };
  }
  const { share, link, hostname } = row;
  const key = parseShareRange(range);

  const cacheKey = `share-stats:${share.id}:${key}`;
  const cached = await cacheGet<SharedStats>(cacheKey);
  if (cached) {
    return { status: "ok", stats: cached };
  }

  const plan = await getWorkspacePlan(share.workspaceId);
  const requested = resolveRange(key);
  const resolved = clampRangeToRetention(requested, plan.limits.retentionDays);
  const scope = { workspaceId: share.workspaceId, linkId: link.id, from: resolved.from, to: resolved.to };

  const [summary, timeseries, devices, browsers, countries, referrers] = await Promise.all([
    loadSummary(scope),
    loadTimeseries(scope, resolved.granularity),
    loadBreakdown(scope, "device", 8),
    loadBreakdown(scope, "browser", 8),
    share.showLocations ? loadBreakdown(scope, "country", 10) : Promise.resolve(null),
    share.showReferrers ? loadBreakdown(scope, "referrer", 10) : Promise.resolve(null),
  ]);

  const stats: SharedStats = {
    link: {
      title: link.title,
      shortUrl: shortUrl(hostname, link.slug),
      hostname,
      slug: link.slug,
      destinationHost: hostOf(link.destination),
      createdAt: link.createdAt.toISOString(),
    },
    range: {
      key,
      from: resolved.from.toISOString(),
      to: resolved.to.toISOString(),
      granularity: resolved.granularity,
      clamped: resolved.from.getTime() !== requested.from.getTime(),
    },
    totals: {
      clicks: summary.clicks,
      qrScans: summary.qrScans,
      visitors: summary.visitors,
      previousClicks: summary.previousClicks,
      previousQrScans: summary.previousQrScans,
      previousVisitors: summary.previousVisitors,
    },
    timeseries,
    devices,
    browsers,
    countries,
    referrers,
    share: {
      expiresAt: share.expiresAt?.toISOString() ?? null,
      showReferrers: share.showReferrers,
      showLocations: share.showLocations,
    },
    generatedAt: new Date().toISOString(),
  };

  await cacheSet(cacheKey, stats, SHARE_STATS_CACHE_SECONDS);
  return { status: "ok", stats };
}

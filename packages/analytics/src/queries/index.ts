import { toClickhouseDateTime } from "@short/core";
import { chQuery, type QueryParams } from "../client";

export type StatsScope = {
  workspaceId: string;
  /** Narrow to one link. Omit for workspace-wide numbers. */
  linkId?: string;
  biopageId?: string;
  qrId?: string;
  eventType?: "click" | "qr_scan" | "bio_view" | "bio_click";
  from: Date;
  to: Date;
  /** Bots are excluded by default; the panel exposes a toggle. */
  includeBots?: boolean;
  country?: string;
  device?: string;
  referrerDomain?: string;
};

export type Granularity = "hour" | "day";

/**
 * Column whitelist for breakdowns. Column names cannot be bound as query parameters,
 * so every dimension the API accepts must be listed here.
 */
export const BREAKDOWN_DIMENSIONS = {
  country: "country",
  region: "region",
  city: "city",
  continent: "continent",
  device: "device",
  os: "os",
  browser: "browser",
  referrer: "referrer_domain",
  utm_source: "utm_source",
  utm_medium: "utm_medium",
  utm_campaign: "utm_campaign",
  language: "language",
  slug: "slug",
  hostname: "hostname",
  block: "block_id",
  qr: "qr_id",
  type: "type",
} as const;

export type BreakdownDimension = keyof typeof BREAKDOWN_DIMENSIONS;

type Filters = { where: string; params: QueryParams };

function buildFilters(scope: StatsScope): Filters {
  const clauses = ["workspace_id = {workspaceId:String}", "ts >= {from:DateTime64(3)}", "ts < {to:DateTime64(3)}"];
  const params: QueryParams = {
    workspaceId: scope.workspaceId,
    from: toClickhouseDateTime(scope.from.toISOString()),
    to: toClickhouseDateTime(scope.to.toISOString()),
  };

  if (scope.linkId) {
    clauses.push("link_id = {linkId:String}");
    params.linkId = scope.linkId;
  }
  if (scope.biopageId) {
    clauses.push("biopage_id = {biopageId:String}");
    params.biopageId = scope.biopageId;
  }
  if (!scope.includeBots) {
    clauses.push("is_bot = 0");
  }
  if (scope.country) {
    clauses.push("country = {country:String}");
    params.country = scope.country;
  }
  if (scope.device) {
    clauses.push("device = {device:String}");
    params.device = scope.device;
  }
  if (scope.referrerDomain) {
    clauses.push("referrer_domain = {referrerDomain:String}");
    params.referrerDomain = scope.referrerDomain;
  }
  if (scope.qrId) {
    clauses.push("qr_id = {qrId:String}");
    params.qrId = scope.qrId;
  }
  if (scope.eventType) {
    clauses.push("type = {eventType:String}");
    params.eventType = scope.eventType;
  }

  return { where: clauses.join(" AND "), params };
}

export type SummaryResult = {
  clicks: number;
  qrScans: number;
  bioViews: number;
  bioClicks: number;
  visitors: number;
  countries: number;
  /** Same-length window immediately before `from`, for delta badges. */
  previousClicks: number;
  previousVisitors: number;
  previousBioViews: number;
  previousBioClicks: number;
};

export async function getSummary(scope: StatsScope): Promise<SummaryResult> {
  const { where, params } = buildFilters(scope);

  const windowMs = scope.to.getTime() - scope.from.getTime();
  // Lifetime (and other multi-year windows) have no meaningful previous period.
  const skipPrevious = windowMs > 366 * 24 * 60 * 60 * 1000;

  const [current] = await chQuery<{
    clicks: string;
    qr_scans: string;
    bio_views: string;
    bio_clicks: string;
    visitors: string;
    countries: string;
  }>(
    `SELECT
        countIf(type = 'click') AS clicks,
        countIf(type = 'qr_scan') AS qr_scans,
        countIf(type = 'bio_view') AS bio_views,
        countIf(type = 'bio_click') AS bio_clicks,
        uniq(visitor_id) AS visitors,
        uniq(country) AS countries
     FROM events WHERE ${where}`,
    params,
  );

  if (skipPrevious) {
    return {
      clicks: Number(current?.clicks ?? 0),
      qrScans: Number(current?.qr_scans ?? 0),
      bioViews: Number(current?.bio_views ?? 0),
      bioClicks: Number(current?.bio_clicks ?? 0),
      visitors: Number(current?.visitors ?? 0),
      countries: Number(current?.countries ?? 0),
      previousClicks: 0,
      previousVisitors: 0,
      previousBioViews: 0,
      previousBioClicks: 0,
    };
  }

  const previous = buildFilters({
    ...scope,
    from: new Date(scope.from.getTime() - windowMs),
    to: scope.from,
  });

  const [prior] = await chQuery<{
    clicks: string;
    bio_views: string;
    bio_clicks: string;
    visitors: string;
  }>(
    `SELECT
        countIf(type = 'click') AS clicks,
        countIf(type = 'bio_view') AS bio_views,
        countIf(type = 'bio_click') AS bio_clicks,
        uniq(visitor_id) AS visitors
     FROM events WHERE ${previous.where}`,
    previous.params,
  );

  return {
    clicks: Number(current?.clicks ?? 0),
    qrScans: Number(current?.qr_scans ?? 0),
    bioViews: Number(current?.bio_views ?? 0),
    bioClicks: Number(current?.bio_clicks ?? 0),
    visitors: Number(current?.visitors ?? 0),
    countries: Number(current?.countries ?? 0),
    previousClicks: Number(prior?.clicks ?? 0),
    previousVisitors: Number(prior?.visitors ?? 0),
    previousBioViews: Number(prior?.bio_views ?? 0),
    previousBioClicks: Number(prior?.bio_clicks ?? 0),
  };
}

export type VariantBreakdownRow = {
  variantId: string;
  clicks: number;
  visitors: number;
  share: number;
};

export async function getVariantBreakdown(scope: StatsScope): Promise<VariantBreakdownRow[]> {
  const { where, params } = buildFilters(scope);
  const rows = await chQuery<{ variant_id: string; clicks: string; visitors: string }>(
    `SELECT variant_id, count() AS clicks, uniq(visitor_id) AS visitors
     FROM events
     WHERE ${where} AND variant_id != ''
     GROUP BY variant_id
     ORDER BY clicks DESC`,
    params,
  );
  const total = rows.reduce((sum, row) => sum + Number(row.clicks), 0);
  return rows.map((row) => ({
    variantId: row.variant_id,
    clicks: Number(row.clicks),
    visitors: Number(row.visitors),
    share: total === 0 ? 0 : Number(row.clicks) / total,
  }));
}

export type TimeseriesPoint = { bucket: string; clicks: number; visitors: number };

export async function getTimeseries(
  scope: StatsScope,
  granularity: Granularity = "day",
): Promise<TimeseriesPoint[]> {
  const { where, params } = buildFilters(scope);
  const bucketFn = granularity === "hour" ? "toStartOfHour" : "toStartOfDay";
  const step = granularity === "hour" ? "INTERVAL 1 HOUR" : "INTERVAL 1 DAY";
  const spanMs = scope.to.getTime() - scope.from.getTime();
  // WITH FILL materialises every bucket; lifetime / multi-year custom ranges
  // would emit thousands of empty rows.
  const fill = spanMs <= 400 * 24 * 60 * 60 * 1000;
  const order = fill
    ? `ORDER BY bucket WITH FILL
       FROM ${bucketFn}(toDateTime64({from:DateTime64(3)}, 3))
       TO ${bucketFn}(toDateTime64({to:DateTime64(3)}, 3))
       STEP ${step}`
    : "ORDER BY bucket";

  const rows = await chQuery<{ bucket: string; clicks: string; visitors: string }>(
    `SELECT ${bucketFn}(ts) AS bucket, count() AS clicks, uniq(visitor_id) AS visitors
     FROM events
     WHERE ${where}
     GROUP BY bucket
     ${order}`,
    params,
  );

  return rows.map((row) => ({
    bucket: row.bucket,
    clicks: Number(row.clicks),
    visitors: Number(row.visitors),
  }));
}

export type BreakdownRow = { key: string; clicks: number; visitors: number; share: number };

export async function getBreakdown(
  scope: StatsScope,
  dimension: BreakdownDimension,
  limit = 10,
): Promise<BreakdownRow[]> {
  const column = BREAKDOWN_DIMENSIONS[dimension];
  if (!column) {
    throw new Error(`Unsupported breakdown dimension: ${dimension}`);
  }

  const { where, params } = buildFilters(scope);
  const rows = await chQuery<{ key: string; clicks: string; visitors: string }>(
    `SELECT ${column} AS key, count() AS clicks, uniq(visitor_id) AS visitors
     FROM events
     WHERE ${where}
     GROUP BY key
     ORDER BY clicks DESC
     LIMIT {limit:UInt32}`,
    { ...params, limit },
  );

  const total = rows.reduce((sum, row) => sum + Number(row.clicks), 0);
  return rows.map((row) => ({
    key: row.key === "" ? "unknown" : row.key,
    clicks: Number(row.clicks),
    visitors: Number(row.visitors),
    share: total === 0 ? 0 : Number(row.clicks) / total,
  }));
}

export type TopLinkRow = {
  linkId: string;
  hostname: string;
  slug: string;
  clicks: number;
  visitors: number;
};

export async function getTopLinks(scope: StatsScope, limit = 10): Promise<TopLinkRow[]> {
  const { where, params } = buildFilters(scope);
  const rows = await chQuery<{
    link_id: string;
    hostname: string;
    slug: string;
    clicks: string;
    visitors: string;
  }>(
    `SELECT link_id, any(hostname) AS hostname, any(slug) AS slug,
            count() AS clicks, uniq(visitor_id) AS visitors
     FROM events
     WHERE ${where} AND link_id != ''
     GROUP BY link_id
     ORDER BY clicks DESC
     LIMIT {limit:UInt32}`,
    { ...params, limit },
  );

  return rows.map((row) => ({
    linkId: row.link_id,
    hostname: row.hostname,
    slug: row.slug,
    clicks: Number(row.clicks),
    visitors: Number(row.visitors),
  }));
}

export type RecentEventRow = {
  ts: string;
  type: string;
  hostname: string;
  slug: string;
  linkId: string;
  country: string;
  city: string;
  device: string;
  os: string;
  browser: string;
  referrerDomain: string;
  destination: string;
  ip: string;
};

export async function getRecentEvents(scope: StatsScope, limit = 25): Promise<RecentEventRow[]> {
  const { where, params } = buildFilters(scope);
  const rows = await chQuery<{
    ts: string;
    type: string;
    hostname: string;
    slug: string;
    link_id: string;
    country: string;
    city: string;
    device: string;
    os: string;
    browser: string;
    referrer_domain: string;
    destination: string;
    ip: string;
  }>(
    `SELECT ts, type, hostname, slug, link_id, country, city, device, os, browser, referrer_domain, destination, ip
     FROM events
     WHERE ${where}
     ORDER BY ts DESC
     LIMIT {limit:UInt32}`,
    { ...params, limit },
  );

  return rows.map((row) => ({
    ts: row.ts,
    type: row.type,
    hostname: row.hostname,
    slug: row.slug,
    linkId: row.link_id,
    country: row.country,
    city: row.city,
    device: row.device,
    os: row.os,
    browser: row.browser,
    referrerDomain: row.referrer_domain,
    destination: row.destination,
    ip: row.ip,
  }));
}

/**
 * Daily series straight from the rollup. Cheaper than scanning `events` and used by
 * the workspace dashboard and the admin platform charts where ranges span months.
 */
export async function getWorkspaceDailySeries(
  workspaceId: string,
  from: Date,
  to: Date,
): Promise<TimeseriesPoint[]> {
  const rows = await chQuery<{ bucket: string; clicks: string; visitors: string }>(
    `SELECT day AS bucket, sum(clicks) AS clicks, uniqMerge(visitors) AS visitors
     FROM link_daily
     WHERE workspace_id = {workspaceId:String}
       AND day >= toDate({from:DateTime64(3)})
       AND day <= toDate({to:DateTime64(3)})
     GROUP BY day
     ORDER BY day WITH FILL
       FROM toDate({from:DateTime64(3)}) TO toDate({to:DateTime64(3)}) STEP INTERVAL 1 DAY`,
    {
      workspaceId,
      from: toClickhouseDateTime(from.toISOString()),
      to: toClickhouseDateTime(to.toISOString()),
    },
  );

  return rows.map((row) => ({
    bucket: row.bucket,
    clicks: Number(row.clicks),
    visitors: Number(row.visitors),
  }));
}

/** Billable click count for a `YYYY-MM` period, read from the rollup. */
export async function getMonthlyClickTotal(workspaceId: string, period: string): Promise<number> {
  const [row] = await chQuery<{ clicks: string }>(
    `SELECT sum(clicks) AS clicks
     FROM link_daily
     WHERE workspace_id = {workspaceId:String}
       AND link_id != ''
       AND toYYYYMM(day) = toUInt32(replace({period:String}, '-', ''))`,
    { workspaceId, period },
  );
  return Number(row?.clicks ?? 0);
}

export type PlatformTotals = {
  clicks: number;
  visitors: number;
  workspaces: number;
};

export async function getPlatformTotals(from: Date, to: Date): Promise<PlatformTotals> {
  const [row] = await chQuery<{ clicks: string; visitors: string; workspaces: string }>(
    `SELECT count() AS clicks, uniq(visitor_id) AS visitors, uniq(workspace_id) AS workspaces
     FROM events
     WHERE ts >= {from:DateTime64(3)} AND ts < {to:DateTime64(3)} AND is_bot = 0`,
    {
      from: toClickhouseDateTime(from.toISOString()),
      to: toClickhouseDateTime(to.toISOString()),
    },
  );

  return {
    clicks: Number(row?.clicks ?? 0),
    visitors: Number(row?.visitors ?? 0),
    workspaces: Number(row?.workspaces ?? 0),
  };
}

export async function getPlatformDailySeries(from: Date, to: Date): Promise<TimeseriesPoint[]> {
  const rows = await chQuery<{ bucket: string; clicks: string; visitors: string }>(
    `SELECT day AS bucket, sum(clicks) AS clicks, uniqMerge(visitors) AS visitors
     FROM link_daily
     WHERE day >= toDate({from:DateTime64(3)}) AND day <= toDate({to:DateTime64(3)})
     GROUP BY day
     ORDER BY day WITH FILL
       FROM toDate({from:DateTime64(3)}) TO toDate({to:DateTime64(3)}) STEP INTERVAL 1 DAY`,
    {
      from: toClickhouseDateTime(from.toISOString()),
      to: toClickhouseDateTime(to.toISOString()),
    },
  );

  return rows.map((row) => ({
    bucket: row.bucket,
    clicks: Number(row.clicks),
    visitors: Number(row.visitors),
  }));
}

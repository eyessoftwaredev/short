import {
  getBreakdown,
  getMonthlyClickTotal,
  getPlatformDailySeries,
  getPlatformTotals,
  getRecentEvents,
  getSummary,
  getTimeseries,
  getTopLinks,
  getVariantBreakdown,
  type BreakdownRow,
  type Granularity,
  type PlatformTotals,
  type RecentEventRow,
  type StatsScope,
  type SummaryResult,
  type TimeseriesPoint,
  type TopLinkRow,
} from "@short/analytics";
import type { BreakdownSet } from "@/components/charts/stats-breakdowns";

const EMPTY_SUMMARY: SummaryResult = {
  clicks: 0,
  qrScans: 0,
  bioViews: 0,
  bioClicks: 0,
  visitors: 0,
  countries: 0,
  previousClicks: 0,
  previousVisitors: 0,
  previousBioViews: 0,
  previousBioClicks: 0,
};

/**
 * ClickHouse is a separate service from the panel's own Postgres. If it is unreachable
 * the page still has to render — stats degrade to zeroes instead of a 500.
 */
async function safe<T>(promise: Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.error(`[analytics] ${label} failed`, error);
    return fallback;
  }
}

export async function loadSummary(scope: StatsScope): Promise<SummaryResult> {
  return safe(getSummary(scope), EMPTY_SUMMARY, "summary");
}

export async function loadTimeseries(
  scope: StatsScope,
  granularity: Granularity,
): Promise<TimeseriesPoint[]> {
  return safe(getTimeseries(scope, granularity), [], "timeseries");
}

export async function loadTopLinks(scope: StatsScope, limit = 8): Promise<TopLinkRow[]> {
  return safe(getTopLinks(scope, limit), [], "topLinks");
}

export async function loadRecentEvents(scope: StatsScope, limit = 25): Promise<RecentEventRow[]> {
  return safe(getRecentEvents(scope, limit), [], "recentEvents");
}

export async function loadPlatformTotals(from: Date, to: Date): Promise<PlatformTotals> {
  return safe(
    getPlatformTotals(from, to),
    { clicks: 0, visitors: 0, workspaces: 0 },
    "platformTotals",
  );
}

export async function loadPlatformSeries(from: Date, to: Date): Promise<TimeseriesPoint[]> {
  return safe(getPlatformDailySeries(from, to), [], "platformSeries");
}

/** Falls back to the `usage_counters` mirror when ClickHouse is unreachable. */
export async function loadMonthlyClicks(
  workspaceId: string,
  period: string,
  fallback: number,
): Promise<number> {
  return safe(getMonthlyClickTotal(workspaceId, period), fallback, "monthlyClicks");
}

export async function loadBreakdownSet(scope: StatsScope, limit = 10): Promise<BreakdownSet> {
  const dimensions = [
    "country",
    "region",
    "city",
    "device",
    "os",
    "browser",
    "language",
    "referrer",
    "utm_source",
    "utm_medium",
    "utm_campaign",
  ] as const;

  const results = await Promise.all(
    dimensions.map((dimension) =>
      safe<BreakdownRow[]>(getBreakdown(scope, dimension, limit), [], `breakdown:${dimension}`),
    ),
  );

  const [
    country,
    region,
    city,
    device,
    os,
    browser,
    language,
    referrer,
    utmSource,
    utmMedium,
    utmCampaign,
  ] = results;

  return {
    country,
    region,
    city,
    device,
    os,
    browser,
    language,
    referrer,
    utmSource,
    utmMedium,
    utmCampaign,
  };
}

export async function loadVariantBreakdown(scope: StatsScope) {
  return safe(getVariantBreakdown(scope), [], "variants");
}

export type { BreakdownSet };

import type { Granularity, SummaryResult } from "@short/analytics";

export const RANGE_KEYS = ["24h", "7d", "30d", "90d", "12m", "all", "custom"] as const;

export type RangeKey = (typeof RANGE_KEYS)[number];

export const RANGE_OPTIONS: Array<{ value: RangeKey }> = RANGE_KEYS.map((value) => ({ value }));

export const RANGE_LABEL_KEYS: Record<RangeKey, string> = {
  "24h": "range24h",
  "7d": "range7d",
  "30d": "range30d",
  "90d": "range90d",
  "12m": "range12m",
  all: "rangeAll",
  custom: "rangeCustom",
};

const DAY = 24 * 60 * 60 * 1000;
/** Earliest bound for "all time" so ClickHouse never scans from year 1970. */
export const LIFETIME_FROM = new Date(Date.UTC(2015, 0, 1));

const SPANS: Record<Exclude<RangeKey, "all" | "custom">, number> = {
  "24h": DAY,
  "7d": 7 * DAY,
  "30d": 30 * DAY,
  "90d": 90 * DAY,
  "12m": 365 * DAY,
};

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export type ResolvedRange = {
  key: RangeKey;
  label: string;
  from: Date;
  to: Date;
  /** Inclusive calendar bounds for `<input type="date">`. */
  fromDate: string;
  toDate: string;
  granularity: Granularity;
  comparePrevious: boolean;
};

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseRangeKey(value: string | string[] | undefined): RangeKey {
  const candidate = firstParam(value);
  return RANGE_KEYS.includes(candidate as RangeKey) ? (candidate as RangeKey) : "7d";
}

export function toDateInput(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** UTC midnight for a `YYYY-MM-DD` value, or null when the string is not a real day. */
export function parseDateOnly(value: string | string[] | undefined): Date | null {
  const raw = firstParam(value);
  const match = raw ? DATE_ONLY.exec(raw) : null;
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function formatDayLabel(value: Date, withYear: boolean, locale: string): string {
  return value.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  });
}

function customLabel(from: Date, toInclusive: Date, locale: string): string {
  const sameYear = from.getUTCFullYear() === toInclusive.getUTCFullYear();
  return `${formatDayLabel(from, !sameYear, locale)} – ${formatDayLabel(toInclusive, true, locale)}`;
}

function granularityFor(from: Date, to: Date): Granularity {
  return to.getTime() - from.getTime() <= 2 * DAY ? "hour" : "day";
}

export function clampRangeToRetention(range: ResolvedRange, retentionDays: number): ResolvedRange {
  if (retentionDays < 0) {
    return range;
  }
  const earliest = new Date(Date.now() - retentionDays * DAY);
  if (range.from.getTime() >= earliest.getTime()) {
    return range;
  }
  return { ...range, from: earliest, fromDate: toDateInput(earliest) };
}

export function resolveRange(
  value: string | string[] | undefined,
  fromRaw?: string | string[] | undefined,
  toRaw?: string | string[] | undefined,
  locale = "en",
): ResolvedRange {
  const key = parseRangeKey(value);
  const now = new Date();

  if (key === "all") {
    return {
      key,
      label: RANGE_LABEL_KEYS.all,
      from: LIFETIME_FROM,
      to: now,
      fromDate: toDateInput(LIFETIME_FROM),
      toDate: toDateInput(now),
      granularity: "day",
      comparePrevious: false,
    };
  }

  if (key === "custom") {
    const parsedFrom = parseDateOnly(fromRaw);
    const parsedTo = parseDateOnly(toRaw);
    const fallbackTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const fallbackFrom = new Date(fallbackTo.getTime() - 29 * DAY);
    const start = parsedFrom ?? fallbackFrom;
    let endInclusive = parsedTo ?? fallbackTo;
    if (endInclusive.getTime() < start.getTime()) {
      endInclusive = start;
    }
    const endExclusive = new Date(endInclusive.getTime() + DAY);

    return {
      key,
      label: customLabel(start, endInclusive, locale),
      from: start,
      to: endExclusive,
      fromDate: toDateInput(start),
      toDate: toDateInput(endInclusive),
      granularity: granularityFor(start, endExclusive),
      comparePrevious: true,
    };
  }

  const to = now;
  const from = new Date(to.getTime() - SPANS[key]);

  return {
    key,
    label: RANGE_LABEL_KEYS[key],
    from,
    to,
    fromDate: toDateInput(from),
    toDate: toDateInput(to),
    granularity: key === "24h" ? "hour" : "day",
    comparePrevious: true,
  };
}

export function localizedRangeLabel(
  range: ResolvedRange,
  t: (key: string) => string,
): string {
  if (range.key === "custom") {
    return range.label;
  }
  return t(RANGE_LABEL_KEYS[range.key]);
}

/** Percentage change, clamped so a jump from zero reads as +100% instead of Infinity. */
export function deltaPercent(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * More traffic is good news, less is bad. Only for traffic counts — a figure such as
 * "countries reached" has no inherent direction and stays neutral.
 */
export function trendOf(current: number, previous: number): "up" | "down" | "neutral" {
  const delta = deltaPercent(current, previous);
  if (delta === 0) {
    return "neutral";
  }
  return delta > 0 ? "up" : "down";
}

type EventCounts = Pick<SummaryResult, "clicks" | "qrScans" | "bioViews" | "bioClicks">;
type PreviousEventCounts = Pick<
  SummaryResult,
  "previousClicks" | "previousQrScans" | "previousBioViews" | "previousBioClicks"
>;

/**
 * Every tracked visit: short-link clicks, QR scans, bio page views and bio link clicks.
 * This is what the time-series charts plot (they count every event in scope), so the
 * headline number has to be the same sum or the card and the chart disagree.
 */
export function totalEvents(summary: EventCounts): number {
  return summary.clicks + summary.qrScans + summary.bioViews + summary.bioClicks;
}

export function previousTotalEvents(summary: PreviousEventCounts): number {
  // `?? 0`: summaries cached before `previousQrScans` existed do not carry it.
  return (
    summary.previousClicks +
    (summary.previousQrScans ?? 0) +
    summary.previousBioViews +
    summary.previousBioClicks
  );
}

const RELATIVE_STEPS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["second", 60],
  ["minute", 60],
  ["hour", 24],
  ["day", 7],
  ["week", 4.35],
  ["month", 12],
  ["year", Number.POSITIVE_INFINITY],
];

/** "3 minutes ago" / "3 dakika önce" — for activity feeds, where the exact time matters less. */
export function formatRelativeTime(value: Date, locale: string, now: Date = new Date()): string {
  let amount = (value.getTime() - now.getTime()) / 1000;
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(amount) < size) {
      return formatter.format(Math.round(amount), unit);
    }
    amount /= size;
  }
  return formatter.format(Math.round(amount), "year");
}

/** "42%", or one decimal under 10% ("4.5%") so small shares do not all read as 0–9%. */
export function formatShare(value: number, total: number): string {
  if (total <= 0 || value <= 0) {
    return "0%";
  }
  const percent = (value / total) * 100;
  if (percent >= 10) {
    return `${Math.round(percent)}%`;
  }
  return `${Math.round(percent * 10) / 10}%`;
}

export function formatDelta(current: number, previous: number, noneLabel: string): string {
  const delta = deltaPercent(current, previous);
  if (delta === 0) {
    return noneLabel;
  }
  return `${delta > 0 ? "↑" : "↓"} ${Math.abs(delta)}%`;
}

const regionNamesCache = new Map<string, Intl.DisplayNames>();

function regionNames(locale: string): Intl.DisplayNames {
  const cached = regionNamesCache.get(locale);
  if (cached) {
    return cached;
  }
  const formatter = new Intl.DisplayNames([locale], { type: "region" });
  regionNamesCache.set(locale, formatter);
  return formatter;
}

export function countryName(code: string, locale: string, unknown: string): string {
  if (code === "" || code.toLowerCase() === "unknown") {
    return unknown;
  }
  try {
    return regionNames(locale).of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

const languageNamesCache = new Map<string, Intl.DisplayNames>();

/** "tr" / "en-US" → "Turkish" / "American English" in the viewer's language. */
export function languageName(code: string, locale: string, unknown: string): string {
  const trimmed = code.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "unknown") {
    return unknown;
  }
  try {
    let formatter = languageNamesCache.get(locale);
    if (!formatter) {
      formatter = new Intl.DisplayNames([locale], { type: "language" });
      languageNamesCache.set(locale, formatter);
    }
    return formatter.of(trimmed) ?? trimmed;
  } catch {
    return trimmed.toUpperCase();
  }
}

export function titleCase(value: string, unknown: string): string {
  if (value === "" || value === "unknown") {
    return unknown;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

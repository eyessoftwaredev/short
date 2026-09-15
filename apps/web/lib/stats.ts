import type { Granularity } from "@short/analytics";

export const RANGE_KEYS = ["24h", "7d", "30d", "90d", "12m"] as const;

export type RangeKey = (typeof RANGE_KEYS)[number];

export const RANGE_OPTIONS: Array<{ value: RangeKey; label: string }> = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "12m", label: "12 months" },
];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const SPANS: Record<RangeKey, number> = {
  "24h": DAY,
  "7d": 7 * DAY,
  "30d": 30 * DAY,
  "90d": 90 * DAY,
  "12m": 365 * DAY,
};

export type ResolvedRange = {
  key: RangeKey;
  label: string;
  from: Date;
  to: Date;
  granularity: Granularity;
};

export function parseRangeKey(value: string | string[] | undefined): RangeKey {
  const candidate = Array.isArray(value) ? value[0] : value;
  return RANGE_KEYS.includes(candidate as RangeKey) ? (candidate as RangeKey) : "7d";
}

export function resolveRange(value: string | string[] | undefined): ResolvedRange {
  const key = parseRangeKey(value);
  const to = new Date();
  const from = new Date(to.getTime() - SPANS[key]);

  return {
    key,
    label: RANGE_OPTIONS.find((option) => option.value === key)?.label ?? key,
    from,
    to,
    granularity: key === "24h" ? "hour" : "day",
  };
}

/** Percentage change, clamped so a jump from zero reads as +100% instead of Infinity. */
export function deltaPercent(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return Math.round(((current - previous) / previous) * 100);
}

export function formatDelta(current: number, previous: number): string {
  const delta = deltaPercent(current, previous);
  if (delta === 0) {
    return "no change";
  }
  return `${delta > 0 ? "↑" : "↓"} ${Math.abs(delta)}%`;
}

const COUNTRY_NAMES: Record<string, string> = {
  TR: "Türkiye",
  US: "United States",
  DE: "Germany",
  GB: "United Kingdom",
  NL: "Netherlands",
  FR: "France",
  AZ: "Azerbaijan",
  RU: "Russia",
  IT: "Italy",
  ES: "Spain",
  SA: "Saudi Arabia",
  AE: "United Arab Emirates",
  CA: "Canada",
  AU: "Australia",
  IN: "India",
  BR: "Brazil",
  JP: "Japan",
  PL: "Poland",
  SE: "Sweden",
  UA: "Ukraine",
};

export function countryName(code: string): string {
  if (code === "" || code.toLowerCase() === "unknown") {
    return "Unknown";
  }
  return COUNTRY_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}

export function titleCase(value: string): string {
  if (value === "" || value === "unknown") {
    return "Unknown";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();
const dateTimeFormats = new Map<string, Intl.DateTimeFormat>();

function formatter<T>(cache: Map<string, T>, locale: string, make: (locale: string) => T): T {
  let value = cache.get(locale);
  if (!value) {
    value = make(locale);
    cache.set(locale, value);
  }
  return value;
}

/**
 * Pass the viewer's locale (`getLocale()` / `useLocale()`): Turkish reads "1,318" as a
 * decimal and needs month names in Turkish. Without one the output stays English.
 */
export function formatNumber(value: number, locale = "en-US"): string {
  return formatter(numberFormats, locale, (tag) => new Intl.NumberFormat(tag)).format(value);
}

export function formatDate(value: Date | string, locale = "en-GB"): string {
  return formatter(
    dateFormats,
    locale,
    (tag) => new Intl.DateTimeFormat(tag, { day: "2-digit", month: "short", year: "numeric" }),
  ).format(typeof value === "string" ? new Date(value) : value);
}

export function formatDateTime(value: Date | string, locale = "en-GB"): string {
  return formatter(
    dateTimeFormats,
    locale,
    (tag) => new Intl.DateTimeFormat(tag, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
  ).format(typeof value === "string" ? new Date(value) : value);
}

/** ClickHouse hands back naive UTC (`2026-09-14 17:02:11`); without the `Z` it reads as local. */
export function parseClickhouseDate(value: string): Date {
  return new Date(`${value.replace(" ", "T")}Z`);
}

export function formatCurrency(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

export function truncateMiddle(value: string, max = 48): string {
  if (value.length <= max) {
    return value;
  }
  const head = Math.ceil((max - 1) / 2);
  const tail = Math.floor((max - 1) / 2);
  return `${value.slice(0, head)}…${value.slice(value.length - tail)}`;
}

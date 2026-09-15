const NUMBER = new Intl.NumberFormat("en-US");
const DATE = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatNumber(value: number): string {
  return NUMBER.format(value);
}

export function formatDate(value: Date | string): string {
  return DATE.format(typeof value === "string" ? new Date(value) : value);
}

export function formatDateTime(value: Date | string): string {
  return DATE_TIME.format(typeof value === "string" ? new Date(value) : value);
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

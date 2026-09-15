import analyticsData from "@/data/analytics.json";

export const MONTHS = analyticsData.months;
export const TODAY = analyticsData.today;
export const WEEK_DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] as const;

function asRangePair(value: string[]): [string, string] {
  return [value[0] ?? "", value[1] ?? ""];
}

export const PRESETS: Record<string, [string, string]> = Object.fromEntries(
  Object.entries(analyticsData.presets).map(([key, value]) => [key, asRangePair(value)]),
);

export function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function iso(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export function fmtLong(s: string): string {
  const parts = s.split("-");
  return `${Number(parts[2])} ${MONTHS[Number(parts[1]) - 1]} ${parts[0]}`;
}

export function dayCount(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1;
}

export type CalendarCell = {
  label: string;
  inMonth: boolean;
  date: string | null;
};

export function buildCalendarGrid(calYear: number, calMonth: number): CalendarCell[] {
  const first = new Date(calYear, calMonth, 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const prevDays = new Date(calYear, calMonth, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let i = lead - 1; i >= 0; i -= 1) {
    cells.push({ label: String(prevDays - i), inMonth: false, date: null });
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push({ label: String(d), inMonth: true, date: iso(calYear, calMonth, d) });
  }
  let next = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ label: String(next), inMonth: false, date: null });
    next += 1;
  }
  return cells;
}

export type CalendarDayStyle = {
  label: string;
  bg: string;
  color: string;
  border: string;
  weight: string;
  radius: string;
  cursor: string;
};

export function styleCalendarDay(
  cell: CalendarCell,
  rStart: string | null,
  rEnd: string | null,
  hoverDate: string | null,
): CalendarDayStyle {
  const previewEnd = rEnd || (rStart && hoverDate && hoverDate > rStart ? hoverDate : null);
  const d = cell.date;
  const isStart = Boolean(d && d === rStart);
  const isEnd = Boolean(d && previewEnd && d === previewEnd);
  const inRange = Boolean(d && rStart && previewEnd && d > rStart && d < previewEnd);
  const edge = isStart || isEnd;
  const today = d === TODAY;

  let radius = "6px";
  if (isStart && isEnd) radius = "6px";
  else if (isStart) radius = "6px 0 0 6px";
  else if (isEnd) radius = "0 6px 6px 0";
  else if (inRange) radius = "0";

  return {
    label: cell.label,
    bg: edge
      ? "var(--accent)"
      : inRange
        ? "var(--accent-surface)"
        : today
          ? "var(--accent-tint)"
          : "var(--bg)",
    color: edge
      ? "var(--on-accent)"
      : cell.inMonth
        ? inRange
          ? "var(--accent-ink)"
          : today
            ? "var(--accent-ink)"
            : "var(--ink)"
        : "var(--fg-faint)",
    border: edge
      ? "var(--accent)"
      : inRange
        ? "var(--accent-surface)"
        : today
          ? "var(--border-strong)"
          : "var(--border-subtle)",
    weight: edge || today ? "500" : "400",
    radius,
    cursor: cell.inMonth ? "pointer" : "default",
  };
}

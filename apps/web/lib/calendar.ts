export type CalendarCell = {
  label: string;
  inMonth: boolean;
  date: string | null;
};

export type CalendarDayRole =
  | "outside"
  | "disabled"
  | "plain"
  | "today"
  | "inRange"
  | "start"
  | "end"
  | "single";

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function todayIso(at: Date = new Date()): string {
  return isoDate(at.getFullYear(), at.getMonth(), at.getDate());
}

export function parseIsoDate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const next = month + delta;
  if (next < 0) {
    return { year: year - 1, month: 11 };
  }
  if (next > 11) {
    return { year: year + 1, month: 0 };
  }
  return { year, month: next };
}

export function buildCalendarGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let index = lead - 1; index >= 0; index -= 1) {
    cells.push({ label: String(prevDays - index), inMonth: false, date: null });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ label: String(day), inMonth: true, date: isoDate(year, month, day) });
  }
  let next = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ label: String(next), inMonth: false, date: null });
    next += 1;
  }
  return cells;
}

export function previewEnd(
  start: string | null,
  end: string | null,
  hover: string | null,
): string | null {
  if (end) {
    return end;
  }
  if (start && hover && hover > start) {
    return hover;
  }
  return null;
}

export function calendarDayRole(
  cell: CalendarCell,
  start: string | null,
  end: string | null,
  hover: string | null,
  today: string,
  max?: string,
): CalendarDayRole {
  if (!cell.inMonth || !cell.date) {
    return "outside";
  }
  if (max && cell.date > max) {
    return "disabled";
  }

  const close = previewEnd(start, end, hover);
  const isStart = cell.date === start;
  const isEnd = Boolean(close && cell.date === close);
  if (isStart && isEnd) {
    return "single";
  }
  if (isStart) {
    return "start";
  }
  if (isEnd) {
    return "end";
  }
  if (start && close && cell.date > start && cell.date < close) {
    return "inRange";
  }
  if (cell.date === today) {
    return "today";
  }
  return "plain";
}

export function weekdayLabels(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  return Array.from({ length: 7 }, (_, index) => formatter.format(new Date(Date.UTC(2024, 0, 1 + index))));
}

export function monthTitle(year: number, month: number, locale: string): string {
  return new Date(year, month, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
}

export function formatIsoDate(value: string, locale: string): string {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return value;
  }
  return new Date(parsed.year, parsed.month, parsed.day).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function inclusiveDayCount(from: string, to: string): number {
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  if (!start || !end) {
    return 0;
  }
  const fromUtc = Date.UTC(start.year, start.month, start.day);
  const toUtc = Date.UTC(end.year, end.month, end.day);
  return Math.round((toUtc - fromUtc) / 86_400_000) + 1;
}

"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/kit/icon";
import { cn } from "@/lib/cx";
import {
  buildCalendarGrid,
  calendarDayRole,
  monthTitle,
  shiftMonth,
  weekdayLabels,
  type CalendarDayRole,
} from "@/lib/calendar";

const DAY_CLASS: Record<CalendarDayRole, string> = {
  outside: "cursor-default border-transparent bg-transparent text-fg-faint",
  disabled: "cursor-not-allowed border-transparent bg-transparent text-fg-disabled",
  plain: "border-border-subtle bg-bg text-ink hover:bg-surface",
  today: "border-border-strong bg-accent-tint font-medium text-accent-ink",
  inRange: "rounded-none border-accent-surface bg-accent-surface text-accent-ink",
  start: "rounded-l-sm rounded-r-none border-accent bg-accent font-medium text-on-accent",
  end: "rounded-l-none rounded-r-sm border-accent bg-accent font-medium text-on-accent",
  single: "border-accent bg-accent font-medium text-on-accent",
};

type CalendarProps = {
  year: number;
  month: number;
  locale: string;
  start: string | null;
  end: string | null;
  hover: string | null;
  today: string;
  max?: string;
  prevLabel: string;
  nextLabel: string;
  onMonthChange: (year: number, month: number) => void;
  onPick: (date: string) => void;
  onHover: (date: string | null) => void;
};

export function Calendar({
  year,
  month,
  locale,
  start,
  end,
  hover,
  today,
  max,
  prevLabel,
  nextLabel,
  onMonthChange,
  onPick,
  onHover,
}: CalendarProps) {
  const weekdays = weekdayLabels(locale);
  const cells = buildCalendarGrid(year, month);

  function go(delta: number): void {
    const next = shiftMonth(year, month, delta);
    onMonthChange(next.year, next.month);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="sm" icon aria-label={prevLabel} onClick={() => go(-1)}>
          <Icon name="chevron-left" className="text-sm" />
        </Button>
        <div className="text-sm font-semibold capitalize">{monthTitle(year, month, locale)}</div>
        <Button type="button" variant="ghost" size="sm" icon aria-label={nextLabel} onClick={() => go(1)}>
          <Icon name="chevron-right" className="text-sm" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdays.map((day) => (
          <div
            key={day}
            className="py-1 text-center font-mono text-xs tracking-widest text-fg-disabled uppercase"
          >
            {day}
          </div>
        ))}
        {cells.map((cell, index) => {
          const role = calendarDayRole(cell, start, end, hover, today, max);
          const disabled = role === "outside" || role === "disabled";
          return (
            <button
              key={`${cell.label}-${index}`}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (cell.date && !disabled) {
                  onPick(cell.date);
                }
              }}
              onMouseEnter={() => {
                if (cell.date && !disabled) {
                  onHover(cell.date);
                }
              }}
              onMouseLeave={() => onHover(null)}
              className={cn(
                "h-9 rounded-sm font-mono text-sm transition duration-150",
                DAY_CLASS[role],
              )}
            >
              {cell.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

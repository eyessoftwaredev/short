"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/kit/icon";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select } from "@/components/ui/field";
import { formatIsoDate, parseIsoDate, todayIso } from "@/lib/calendar";
import { cn } from "@/lib/cx";

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

type DateTimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  locale: string;
  placeholder: string;
  clearLabel: string;
  prevLabel: string;
  nextLabel: string;
  hourLabel: string;
  minuteLabel: string;
};

function parseValue(value: string): { date: string; hour: string; minute: string } | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  return { date: match[1], hour: match[2], minute: match[3] };
}

function compose(date: string, hour: string, minute: string): string {
  return `${date}T${hour}:${minute}`;
}

export function DateTimePicker({
  value,
  onChange,
  locale,
  placeholder,
  clearLabel,
  prevLabel,
  nextLabel,
  hourLabel,
  minuteLabel,
}: DateTimePickerProps) {
  const parsed = parseValue(value);
  const today = todayIso();
  const seed = parseIsoDate(parsed?.date ?? today);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(seed?.year ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(seed?.month ?? new Date().getMonth());
  const rootRef = useRef<HTMLDivElement>(null);

  const hour = parsed?.hour ?? "09";
  const minute = parsed?.minute ?? "00";
  const minuteOptions = MINUTES.includes(minute) ? MINUTES : [...MINUTES, minute].sort();

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const label = parsed
    ? `${formatIsoDate(parsed.date, locale)} · ${parsed.hour}:${parsed.minute}`
    : placeholder;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full min-w-0 items-center gap-2.5 rounded-default border border-border-strong bg-bg px-3 py-2 text-left transition duration-200 hover:bg-surface",
          parsed ? "text-ink" : "text-fg-subtle",
        )}
      >
        <Icon name="calendar" className="shrink-0 text-sm text-fg-subtle" />
        <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
        <Icon name="chevron-down" className="shrink-0 text-xs text-fg-subtle" />
      </button>

      {open ? (
        <div
          role="dialog"
          className="absolute top-full left-0 z-dropdown mt-1 flex w-80 min-w-0 flex-col gap-4 rounded-default border border-border bg-bg p-5 shadow-pop"
        >
          <Calendar
            year={viewYear}
            month={viewMonth}
            locale={locale}
            start={parsed?.date ?? null}
            end={parsed?.date ?? null}
            hover={hover}
            today={today}
            prevLabel={prevLabel}
            nextLabel={nextLabel}
            onMonthChange={(nextYear, nextMonth) => {
              setViewYear(nextYear);
              setViewMonth(nextMonth);
            }}
            onPick={(date) => {
              onChange(compose(date, hour, minute));
              const next = parseIsoDate(date);
              if (next) {
                setViewYear(next.year);
                setViewMonth(next.month);
              }
            }}
            onHover={setHover}
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-muted">{hourLabel}</span>
              <Select
                value={hour}
                onChange={(event) => {
                  const nextHour = event.target.value;
                  onChange(compose(parsed?.date ?? today, nextHour, minute));
                }}
              >
                {HOURS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-muted">{minuteLabel}</span>
              <Select
                value={minute}
                onChange={(event) => {
                  const nextMinute = event.target.value;
                  onChange(compose(parsed?.date ?? today, hour, nextMinute));
                }}
              >
                {minuteOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <div className="flex items-center justify-end border-t border-border pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              <Icon name="xmark" className="text-xs" />
              {clearLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

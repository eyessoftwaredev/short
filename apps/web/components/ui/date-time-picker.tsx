"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/kit/icon";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input, Select } from "@/components/ui/field";
import { scheduleInstant } from "@short/core";
import { formatIsoDate, parseIsoDate, todayIso } from "@/lib/calendar";

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

type Parts = { date: string; hour: string; minute: string };

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function parseValue(value: string): Parts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match || Number(match[1]) < 2000) {
    return null;
  }
  if (!scheduleInstant(value)) {
    return null;
  }
  return { date: `${match[1]}-${match[2]}-${match[3]}`, hour: match[4], minute: match[5] };
}

function compose(date: string, hour: string, minute: string): string {
  return `${date}T${hour}:${minute}`;
}

function parseTyped(raw: string, fallbackTime: { hour: string; minute: string }): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return "";
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(trimmed);
  if (iso) {
    const next = compose(iso[1] + "-" + iso[2] + "-" + iso[3], iso[4] ?? fallbackTime.hour, iso[5] ?? fallbackTime.minute);
    return scheduleInstant(next) ? next : null;
  }

  const dotted = /^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:[ T](\d{2}):(\d{2}))?$/.exec(trimmed);
  if (dotted) {
    const next = compose(
      `${dotted[3]}-${pad(Number(dotted[2]))}-${pad(Number(dotted[1]))}`,
      dotted[4] ?? fallbackTime.hour,
      dotted[5] ?? fallbackTime.minute,
    );
    return scheduleInstant(next) ? next : null;
  }

  return null;
}

function displayValue(parts: Parts | null, locale: string): string {
  if (!parts) {
    return "";
  }
  return `${formatIsoDate(parts.date, locale)} ${parts.hour}:${parts.minute}`;
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
  const now = new Date();
  const seed = parseIsoDate(parsed?.date ?? today);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(seed?.year ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(seed?.month ?? now.getMonth());
  const [typed, setTyped] = useState(displayValue(parsed, locale));
  const rootRef = useRef<HTMLDivElement>(null);

  const hour = parsed?.hour ?? "09";
  const minute = parsed?.minute ?? "00";
  const minuteOptions = MINUTES.includes(minute) ? MINUTES : [...MINUTES, minute].sort();
  const years = Array.from({ length: 12 }, (_, index) => now.getFullYear() - 1 + index);
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, month) => ({
        value: month,
        label: new Date(2024, month, 1).toLocaleDateString(locale, { month: "long" }),
      })),
    [locale],
  );

  useEffect(() => {
    setTyped(displayValue(parseValue(value), locale));
  }, [locale, value]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const next = parseIsoDate(parsed?.date ?? today);
    if (next) {
      setViewYear(next.year);
      setViewMonth(next.month);
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
  }, [open, parsed?.date, today]);

  function commitTyped(): void {
    const next = parseTyped(typed, { hour, minute });
    if (next === null) {
      setTyped(displayValue(parsed, locale));
      return;
    }
    onChange(next);
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <div className="flex min-w-0 items-center gap-2">
        <Input
          value={typed}
          placeholder={placeholder}
          spellCheck={false}
          onChange={(event) => setTyped(event.target.value)}
          onBlur={commitTyped}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitTyped();
            }
          }}
        />
        <Button
          type="button"
          icon
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={placeholder}
          onClick={() => setOpen((prev) => !prev)}
        >
          <Icon name="calendar" className="text-sm" />
        </Button>
        {parsed ? (
          <Button
            type="button"
            variant="ghost"
            icon
            aria-label={clearLabel}
            onClick={() => {
              onChange("");
              setTyped("");
              setOpen(false);
            }}
          >
            <Icon name="xmark" className="text-sm" />
          </Button>
        ) : null}
      </div>

      {open ? (
        <div
          role="dialog"
          className="absolute top-full left-0 z-dropdown mt-1 flex w-80 min-w-0 flex-col gap-4 rounded-default border border-border bg-bg p-5 shadow-pop"
        >
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={String(viewMonth)}
              onChange={(event) => setViewMonth(Number(event.target.value))}
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </Select>
            <Select
              value={String(viewYear)}
              onChange={(event) => setViewYear(Number(event.target.value))}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </div>
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
            }}
            onHover={setHover}
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-muted">{hourLabel}</span>
              <Select
                value={hour}
                onChange={(event) => {
                  onChange(compose(parsed?.date ?? today, event.target.value, minute));
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
                  onChange(compose(parsed?.date ?? today, hour, event.target.value));
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
        </div>
      ) : null}
    </div>
  );
}

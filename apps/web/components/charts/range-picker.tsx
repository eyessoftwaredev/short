"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/kit/icon";
import { Button, Calendar, Chip } from "@/components/ui";
import {
  formatIsoDate,
  inclusiveDayCount,
  isoDate,
  parseIsoDate,
  previewEnd,
  todayIso,
} from "@/lib/calendar";
import { RANGE_LABEL_KEYS, RANGE_OPTIONS, type RangeKey } from "@/lib/stats";

const OPEN_AFTER_CUSTOM = "short-range-cal";

/** Writes `?range=` so the server component can re-query without client state. */
export function RangePicker({ value }: { value: RangeKey }) {
  const t = useTranslations("stats");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  const today = todayIso();
  const lookback = new Date();
  lookback.setDate(lookback.getDate() - 29);
  const defaultFrom = isoDate(lookback.getFullYear(), lookback.getMonth(), lookback.getDate());
  const selectedFrom = value === "custom" ? (searchParams.get("from") ?? defaultFrom) : null;
  const selectedTo = value === "custom" ? (searchParams.get("to") ?? today) : null;
  const [draftStart, setDraftStart] = useState<string | null>(selectedFrom);
  const [draftEnd, setDraftEnd] = useState<string | null>(selectedTo);

  const seed = parseIsoDate(draftEnd ?? draftStart ?? today);
  const [viewYear, setViewYear] = useState(seed?.year ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(seed?.month ?? new Date().getMonth());

  function replace(next: URLSearchParams): void {
    const query = next.toString();
    startTransition(() => {
      router.replace(query === "" ? pathname : `${pathname}?${query}`, { scroll: false });
    });
  }

  function select(next: RangeKey): void {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", next);
    if (next === "custom") {
      if (!params.get("from")) {
        params.set("from", defaultFrom);
      }
      if (!params.get("to")) {
        params.set("to", today);
      }
      const from = params.get("from") ?? defaultFrom;
      const to = params.get("to") ?? today;
      setDraftStart(from);
      setDraftEnd(to);
      const parsed = parseIsoDate(to);
      if (parsed) {
        setViewYear(parsed.year);
        setViewMonth(parsed.month);
      }
      try {
        sessionStorage.setItem(OPEN_AFTER_CUSTOM, "1");
      } catch {
        /* private mode */
      }
      setOpen(true);
    } else {
      params.delete("from");
      params.delete("to");
      setOpen(false);
      setDraftStart(null);
      setDraftEnd(null);
    }
    replace(params);
  }

  function applyRange(from: string, to: string): void {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set("from", from);
    params.set("to", to);
    replace(params);
  }

  function pickDay(date: string): void {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(date);
      setDraftEnd(null);
      setHover(null);
      return;
    }
    if (date < draftStart) {
      setDraftStart(date);
      setDraftEnd(draftStart);
      applyRange(date, draftStart);
      setOpen(false);
      return;
    }
    setDraftEnd(date);
    applyRange(draftStart, date);
    setOpen(false);
  }

  function clearRange(): void {
    setDraftStart(null);
    setDraftEnd(null);
    setHover(null);
  }

  useEffect(() => {
    if (value !== "custom") {
      return;
    }
    try {
      if (sessionStorage.getItem(OPEN_AFTER_CUSTOM) === "1") {
        sessionStorage.removeItem(OPEN_AFTER_CUSTOM);
        setOpen(true);
      }
    } catch {
      /* private mode */
    }
  }, [value]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setHover(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setHover(null);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const close = previewEnd(draftStart, draftEnd, hover);
  const fromLabel = draftStart ? formatIsoDate(draftStart, locale) : t("dateUnset");
  const toLabel = close ? formatIsoDate(close, locale) : t("dateUnset");
  const rangeHint = !draftStart
    ? t("pickStart")
    : draftEnd
      ? t("rangeDays", { count: inclusiveDayCount(draftStart, draftEnd) })
      : t("pickEnd");

  return (
    <div className="flex min-w-0 flex-col items-end gap-2" aria-busy={pending}>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {RANGE_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            active={option.value === value}
            onClick={() => select(option.value)}
          >
            {t(RANGE_LABEL_KEYS[option.value])}
          </Chip>
        ))}
      </div>

      {value === "custom" ? (
        <div ref={popoverRef} className="relative">
          <button
            type="button"
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-label={t("customRange")}
            onClick={() => setOpen((prev) => !prev)}
            className="flex min-w-0 flex-wrap items-center gap-2.5 rounded-default border border-border-strong bg-bg px-3 py-2 text-left transition duration-200 hover:bg-surface"
          >
            <span className="flex min-w-0 items-center gap-2 font-mono text-sm">
              <Icon name="calendar" className="shrink-0 text-xs text-fg-subtle" />
              <span className={draftStart ? "text-ink" : "text-fg-subtle"}>{fromLabel}</span>
            </span>
            <Icon name="arrow-right" className="shrink-0 text-xs text-fg-subtle" />
            <span className="flex min-w-0 items-center gap-2 font-mono text-sm">
              <Icon name="calendar" className="shrink-0 text-xs text-fg-subtle" />
              <span className={close ? "text-ink" : "text-fg-subtle"}>{toLabel}</span>
            </span>
          </button>

          {open ? (
            <div
              role="dialog"
              aria-label={t("customRange")}
              className="absolute top-full right-0 z-dropdown mt-1 flex w-80 min-w-0 flex-col gap-4 rounded-default border border-border bg-bg p-5 shadow-pop"
            >
              <Calendar
                year={viewYear}
                month={viewMonth}
                locale={locale}
                start={draftStart}
                end={draftEnd}
                hover={hover}
                today={today}
                max={today}
                prevLabel={t("prevMonth")}
                nextLabel={t("nextMonth")}
                onMonthChange={(year, month) => {
                  setViewYear(year);
                  setViewMonth(month);
                }}
                onPick={pickDay}
                onHover={setHover}
              />
              <div className="flex min-w-0 items-center justify-between gap-3 border-t border-border pt-3.5">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium">
                    {draftStart && close
                      ? `${formatIsoDate(draftStart, locale)} – ${formatIsoDate(close, locale)}`
                      : t("customRange")}
                  </span>
                  <span className="text-xs text-fg-subtle">{rangeHint}</span>
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={clearRange}>
                  <Icon name="xmark" className="text-xs" />
                  {t("clearRange")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

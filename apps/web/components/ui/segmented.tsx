"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/kit/icon";
import { cn } from "@/lib/cx";

export type SegmentedItem<T extends string = string> = {
  id: T;
  label: ReactNode;
  icon?: IconName;
  disabled?: boolean;
  /** Accessible name when `label` is icon-only or not a string. */
  ariaLabel?: string;
};

type SegmentedProps<T extends string> = {
  items: readonly SegmentedItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Names the group for assistive tech, e.g. "Chart granularity". */
  label?: string;
  size?: "sm" | "md";
  /** Stretch segments to fill the container (mobile forms). */
  block?: boolean;
  /** Form field name — renders a hidden input so native forms submit the value. */
  name?: string;
  className?: string;
};

/**
 * Single-choice toggle for 2–5 short options: "Day / Week / Month",
 * "Light / Dark", "Redirect / Deep link". It is a radio group, so arrows move
 * the selection. For switching page sections use `Tabs` instead.
 */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  label,
  size = "md",
  block = false,
  name,
  className,
}: SegmentedProps<T>) {
  const groupRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const enabled = items.filter((item) => !item.disabled);
    const index = enabled.findIndex((item) => item.id === value);
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (index + 1) % enabled.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (index - 1 + enabled.length) % enabled.length;
    }
    if (next == null) {
      return;
    }
    event.preventDefault();
    const target = enabled[next];
    onChange(target.id);
    groupRef.current
      ?.querySelector<HTMLButtonElement>(`[data-segment="${CSS.escape(target.id)}"]`)
      ?.focus();
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "inline-flex min-w-0 items-center gap-0.5 rounded-default border border-border bg-surface p-0.5",
        block && "flex w-full",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={item.ariaLabel}
            data-segment={item.id}
            tabIndex={active ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            className={cn(
              "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-sm font-medium whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40",
              size === "sm" ? "h-6.5 px-2.5 text-xs" : "h-8 px-3 text-[13px]",
              block && "flex-1",
              active
                ? "bg-bg text-ink shadow-xs ring-1 ring-border"
                : "text-fg-muted hover:text-ink",
            )}
          >
            {item.icon ? <Icon name={item.icon} className="text-xs" /> : null}
            {item.label}
          </button>
        );
      })}
      {name ? <input type="hidden" name={name} value={value} /> : null}
    </div>
  );
}

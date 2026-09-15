"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cx";

export type TabItem<T extends string = string> = {
  id: T;
  label: ReactNode;
  count?: number | string;
};

type TabsProps<T extends string> = {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** `underline` for record editors, `pill` for analytics breakdowns. */
  variant?: "underline" | "pill";
  /** Names the tablist for assistive tech, e.g. "Breakdown dimension". */
  label?: string;
  className?: string;
};

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  variant = "underline",
  label,
  className,
}: TabsProps<T>) {
  const isPill = variant === "pill";
  const listRef = useRef<HTMLDivElement>(null);

  /**
   * A tablist is a single tab stop: arrows move between tabs, Tab leaves the
   * group. Without this a keyboard user has to step through every tab to
   * reach the panel.
   */
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const currentIndex = items.findIndex((item) => item.id === value);
    if (currentIndex < 0) {
      return;
    }

    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % items.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + items.length) % items.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = items.length - 1;
    }

    if (nextIndex == null) {
      return;
    }

    event.preventDefault();
    const next = items[nextIndex];
    onChange(next.id);
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "flex min-w-0 gap-1 overflow-x-auto overflow-y-hidden",
        isPill ? "rounded-default bg-surface p-1" : "border-b border-border",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 whitespace-nowrap transition duration-200",
              isPill
                ? "rounded-sm border px-3.5 py-1.5 text-sm font-medium"
                : "-mb-px border-b-2 px-3.5 py-2.5 text-sm",
              isPill && active && "border-border bg-bg text-ink",
              isPill && !active && "border-transparent bg-transparent text-fg-muted hover:text-ink",
              !isPill && active && "border-accent font-semibold text-ink",
              !isPill && !active && "border-transparent font-medium text-fg-muted hover:text-ink",
            )}
          >
            {item.label}
            {item.count != null ? (
              <span
                className={cn(
                  "numeric font-mono text-xs",
                  active ? "text-fg-muted" : "text-fg-subtle",
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

type TabPanelProps = {
  active: boolean;
  children: ReactNode;
  className?: string;
};

export function TabPanel({ active, children, className }: TabPanelProps) {
  if (!active) {
    return null;
  }
  return (
    <div role="tabpanel" tabIndex={0} className={cn("min-w-0", className)}>
      {children}
    </div>
  );
}

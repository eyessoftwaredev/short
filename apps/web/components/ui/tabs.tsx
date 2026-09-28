"use client";

import Link from "next/link";
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cx";

export type TabItem<T extends string = string> = {
  id: T;
  label: ReactNode;
  count?: number | string;
};

/**
 * `underline` — page and record sections (Settings: Profile / Team / API).
 * `segmented` — compact switches inside a card (analytics breakdowns).
 * `pill` is the old name for `segmented` and renders the same.
 */
type TabsVariant = "underline" | "segmented" | "pill";

type TabsProps<T extends string> = {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  variant?: TabsVariant;
  /** Names the tablist for assistive tech, e.g. "Breakdown dimension". */
  label?: string;
  className?: string;
};

function tabClasses(variant: TabsVariant, active: boolean): string {
  if (variant === "underline") {
    return cn(
      "-mb-px inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-1 text-sm whitespace-nowrap transition-colors duration-150",
      active
        ? "border-accent font-semibold text-ink"
        : "border-transparent font-medium text-fg-muted hover:border-border-strong hover:text-ink",
    );
  }
  return cn(
    "inline-flex h-8 shrink-0 items-center gap-2 rounded-sm px-3 text-[13px] font-medium whitespace-nowrap transition-colors duration-150",
    active ? "bg-bg text-ink shadow-xs ring-1 ring-border" : "text-fg-muted hover:text-ink",
  );
}

function listClasses(variant: TabsVariant): string {
  return variant === "underline"
    ? "flex min-w-0 gap-6 overflow-x-auto overflow-y-hidden border-b border-border"
    : "inline-flex max-w-full min-w-0 gap-0.5 overflow-x-auto overflow-y-hidden rounded-default border border-border bg-surface p-0.5";
}

function Count({ value, active }: { value: number | string; active: boolean }) {
  return (
    <span
      className={cn(
        "numeric inline-flex h-5 min-w-5 items-center justify-center rounded-pill px-1.5 text-[11px] font-medium",
        active ? "bg-accent-surface text-accent-on-surface" : "bg-surface-strong text-fg-muted",
      )}
    >
      {value}
    </span>
  );
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  variant = "underline",
  label,
  className,
}: TabsProps<T>) {
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
      className={cn(listClasses(variant), className)}
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
            className={tabClasses(variant, active)}
          >
            {item.label}
            {item.count != null ? <Count value={item.count} active={active} /> : null}
          </button>
        );
      })}
    </div>
  );
}

export type TabLinkItem = {
  id: string;
  label: ReactNode;
  href: string;
  count?: number | string;
};

type TabLinksProps = {
  items: readonly TabLinkItem[];
  /** `id` of the current tab. */
  value: string;
  variant?: TabsVariant;
  /** Names the navigation landmark, e.g. "Link sections". */
  label?: string;
  className?: string;
};

/**
 * Tabs that are real links (`?tab=` or sub-routes), so each tab is
 * shareable, survives a refresh and works without JavaScript. Use in
 * `PageHeader tabs=…` for sectioned pages such as Settings.
 */
export function TabLinks({ items, value, variant = "underline", label, className }: TabLinksProps) {
  return (
    <nav aria-label={label} className={cn(listClasses(variant), className)}>
      {items.map((item) => {
        const active = item.id === value;
        return (
          <Link
            key={item.id}
            href={item.href}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(tabClasses(variant, active), "no-underline hover:no-underline")}
          >
            {item.label}
            {item.count != null ? <Count value={item.count} active={active} /> : null}
          </Link>
        );
      })}
    </nav>
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
    <div role="tabpanel" tabIndex={0} className={cn("min-w-0 focus-visible:rounded-default", className)}>
      {children}
    </div>
  );
}

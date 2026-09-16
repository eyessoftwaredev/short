"use client";

import { Icon } from "@/components/kit/icon";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/brand/locale-switcher";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useTheme } from "@/components/providers/theme-provider";
import { usePanelSession } from "@/components/providers/session-provider";
import { cn } from "@/lib/cx";

type Crumb = {
  label: string;
  href?: string;
};

type TopbarProps = {
  crumbs?: Crumb[];
  current?: string;
  searchPlaceholder?: string;
  /**
   * Hides the topbar search on screens that already own a search field, so a
   * page never shows the user two boxes that do the same thing.
   */
  searchable?: boolean;
  actions?: ReactNode;
};

/** True when the keystroke belongs to whatever the user is currently typing in. */
function isEditing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export function Topbar({
  crumbs = [],
  current,
  searchPlaceholder,
  searchable = true,
  actions,
}: TopbarProps) {
  const { dark, toggleTheme } = useTheme();
  const session = usePanelSession();
  const t = useTranslations("common");
  const router = useRouter();
  const placeholder = searchPlaceholder ?? t("searchLinks");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // The `/` hint next to the field was decorative until now.
  useEffect(() => {
    if (!searchable) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (isEditing(event.target)) {
        return;
      }
      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [searchable]);

  const submitSearch = (): void => {
    const trimmed = query.trim();
    router.push(trimmed === "" ? "/links" : `/links?search=${encodeURIComponent(trimmed)}`);
  };

  const trail: Array<Crumb & { current?: boolean }> = current
    ? [...crumbs, { label: current, current: true }]
    : crumbs;

  return (
    // Sticky so the breadcrumb, search and primary action stay reachable while
    // a long table scrolls underneath.
    <header className="sticky top-0 z-sticky flex min-h-14 flex-nowrap items-center gap-4 border-b border-border bg-bg px-5">
      <nav className="flex min-w-0 shrink items-center" aria-label={t("breadcrumb")}>
        <ol className="m-0 flex min-w-0 list-none items-center gap-2 p-0 text-sm">
          {trail.map((crumb, index) => (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-2">
              {/* Separators sit between items, never trailing off the last one. */}
              {index > 0 ? (
                <span className="shrink-0 text-fg-faint" aria-hidden="true">
                  /
                </span>
              ) : null}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="truncate text-fg-muted no-underline hover:text-ink hover:no-underline"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={crumb.current ? "page" : undefined}
                  className={
                    crumb.current ? "truncate font-medium text-ink" : "truncate text-fg-muted"
                  }
                >
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {searchable ? (
        <div className="relative ml-auto max-w-xs min-w-40 flex-1">
          <label htmlFor="topbar-search" className="sr-only">
            {placeholder}
          </label>
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 text-sm -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
          <input
            id="topbar-search"
            ref={searchRef}
            type="search"
            value={query}
            className="h-9 w-full py-2 pr-10 pl-9"
            placeholder={placeholder}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                submitSearch();
              }
              if (event.key === "Escape") {
                event.currentTarget.blur();
              }
            }}
          />
          <Kbd className="absolute top-1/2 right-2 -translate-y-1/2" aria-hidden="true">
            /
          </Kbd>
        </div>
      ) : null}

      <div className={cn("flex shrink-0 flex-nowrap items-center gap-2", !searchable && "ml-auto")}>
        {actions ?? (
          <Button variant="primary" size="sm" onClick={() => router.push("/links/new")}>
            <Icon name="plus" className="text-sm" />
            {t("newLink")}
          </Button>
        )}
        {/* Separates the page's own action from the always-present shell control. */}
        <span className="h-5 w-px bg-border" aria-hidden="true" />
        {session.localeSwitcherEnabled ? <LocaleSwitcher /> : null}
        <Button
          variant="ghost"
          icon
          aria-label={dark ? t("themeLight") : t("themeDark")}
          onClick={toggleTheme}
        >
          {dark ? <Icon name="sun" className="text-sm" /> : <Icon name="moon" className="text-sm" />}
        </Button>
      </div>
    </header>
  );
}

"use client";

import { Icon } from "@/components/kit/icon";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/brand/locale-switcher";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useTheme } from "@/components/providers/theme-provider";
import { usePanelSession } from "@/components/providers/session-provider";
import { cn } from "@/lib/cx";
import { useShortcutLabel } from "./command-palette";

type Crumb = {
  label: string;
  href?: string;
};

type TopbarProps = {
  crumbs?: Crumb[];
  current?: string;
  /** Label of the command palette trigger. Defaults to "Search or jump to…". */
  searchPlaceholder?: string;
  /**
   * Screens that already own a search field (e.g. the links list) get a compact
   * palette button instead of a second search-shaped box.
   */
  searchable?: boolean;
  actions?: ReactNode;
  onMenuClick?: () => void;
  /** Opens the command palette; the trigger is hidden when omitted. */
  onOpenPalette?: () => void;
};

export function Topbar({
  crumbs = [],
  current,
  searchPlaceholder,
  searchable = true,
  actions,
  onMenuClick,
  onOpenPalette,
}: TopbarProps) {
  const { dark, toggleTheme } = useTheme();
  const session = usePanelSession();
  const t = useTranslations("common");
  const tp = useTranslations("palette");
  const router = useRouter();
  const shortcut = useShortcutLabel();
  const paletteLabel = searchPlaceholder ?? tp("open");
  const paletteTitle = `${paletteLabel} (${shortcut})`;

  const trail: Array<Crumb & { current?: boolean }> = current
    ? [...crumbs, { label: current, current: true }]
    : crumbs;

  const pageTitle = current ?? trail.at(-1)?.label ?? session.workspace.name;

  return (
    <header className="sticky top-0 z-sticky flex min-h-14 flex-wrap items-center gap-2 border-b border-border bg-bg px-4 py-2 lg:flex-nowrap lg:gap-4 lg:px-5 lg:py-0">
      {onMenuClick ? (
        <Button
          variant="ghost"
          icon
          className="shrink-0 lg:hidden"
          aria-label={t("openMenu")}
          onClick={onMenuClick}
        >
          <Icon name="bars" className="text-sm" />
        </Button>
      ) : null}

      <nav
        className="hidden min-w-0 shrink items-center md:flex"
        aria-label={t("breadcrumb")}
      >
        <ol className="m-0 flex min-w-0 list-none items-center gap-2 p-0 text-sm">
          {trail.map((crumb, index) => (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-2">
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

      <h1 className="m-0 min-w-0 flex-1 truncate text-base font-semibold md:hidden">{pageTitle}</h1>

      {onOpenPalette && searchable ? (
        <button
          type="button"
          aria-haspopup="dialog"
          aria-keyshortcuts="Control+K Meta+K"
          title={paletteTitle}
          onClick={onOpenPalette}
          className="hidden h-9 min-w-0 items-center gap-2 rounded-default border border-border-strong bg-bg pr-2 pl-3 text-sm text-fg-subtle transition duration-200 hover:bg-surface hover:text-fg-muted md:ml-auto md:flex md:max-w-xs md:flex-1"
        >
          <Icon name="search" className="shrink-0 text-sm" />
          <span className="min-w-0 flex-1 truncate text-left">{paletteLabel}</span>
          <Kbd className="hidden lg:inline-flex">{shortcut}</Kbd>
        </button>
      ) : null}

      <div
        className={cn(
          "flex shrink-0 flex-nowrap items-center gap-1.5 sm:gap-2",
          !(onOpenPalette && searchable) && "ml-auto",
          onOpenPalette && searchable && "md:ml-0",
        )}
      >
        {onOpenPalette ? (
          <Button
            variant="ghost"
            icon
            className={searchable ? "md:hidden" : undefined}
            aria-label={paletteLabel}
            aria-haspopup="dialog"
            aria-keyshortcuts="Control+K Meta+K"
            title={paletteTitle}
            onClick={onOpenPalette}
          >
            <Icon name="search" className="text-sm" />
          </Button>
        ) : null}
        {actions ?? (
          <>
            <Button
              variant="primary"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => router.push("/links/new")}
            >
              <Icon name="plus" className="text-sm" />
              {t("newLink")}
            </Button>
            <Button
              variant="primary"
              icon
              size="sm"
              className="sm:hidden"
              aria-label={t("newLink")}
              onClick={() => router.push("/links/new")}
            >
              <Icon name="plus" className="text-sm" />
            </Button>
          </>
        )}
        <span className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
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

"use client";

import { Icon } from "@/components/kit/icon";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/brand/locale-switcher";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dropdown, type DropdownItem } from "@/components/ui/dropdown";
import { Kbd } from "@/components/ui/kbd";
import { Breadcrumbs } from "@/components/ui/page-header";
import { useTheme } from "@/components/providers/theme-provider";
import { LOCALES, LOCALE_COOKIE } from "@/i18n/locales";
import { writeClientCookie } from "@/lib/client-cookie";
import { initials, usePanelSession } from "@/components/providers/session-provider";
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
  /** Page-specific controls, rendered left of the global ones. */
  actions?: ReactNode;
  onMenuClick?: () => void;
  /** Opens the command palette; the trigger is hidden when omitted. */
  onOpenPalette?: () => void;
  /** Enables "Sign out" in the account menu. */
  onSignOut?: () => void;
};

/** Each language named in itself, so a lost user can always find theirs. */
const LANGUAGE_NAMES: Record<string, string> = { en: "English", tr: "Türkçe" };

function UserMenu({ onSignOut }: { onSignOut?: () => void }) {
  const session = usePanelSession();
  const { dark, toggleTheme } = useTheme();
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const ts = useTranslations("shell");
  const canBill = session.role === "owner" || session.role === "superadmin";
  const locale = useLocale();
  const languages: DropdownItem[] = session.localeSwitcherEnabled
    ? LOCALES.filter((item) => item !== locale).map((item) => ({
        id: `locale-${item}`,
        label: LANGUAGE_NAMES[item] ?? item.toUpperCase(),
        icon: <Icon name="globe" className="text-xs" />,
        onSelect: () => {
          writeClientCookie(LOCALE_COOKIE, item);
          window.location.reload();
        },
      }))
    : [];

  const items: DropdownItem[] = [
    {
      id: "me",
      label: session.user.name || session.user.email,
      description: session.user.email,
      heading: true,
    },
    {
      id: "settings",
      label: ts("profile"),
      href: "/settings",
      icon: <Icon name="circle-user" className="text-xs" />,
      separated: true,
    },
    ...(canBill
      ? [
          {
            id: "billing",
            label: tn("billing"),
            href: "/billing",
            icon: <Icon name="credit-card" className="text-xs" />,
          },
        ]
      : []),
    {
      id: "docs",
      label: ts("help"),
      href: "/docs",
      icon: <Icon name="circle-question" className="text-xs" />,
    },
    {
      id: "theme",
      label: dark ? tc("themeLight") : tc("themeDark"),
      icon: <Icon name={dark ? "sun" : "moon"} className="text-xs" />,
      onSelect: toggleTheme,
    },
    ...languages,
    ...(onSignOut
      ? [
          {
            id: "sign-out",
            label: tc("signOut"),
            icon: <Icon name="right-from-bracket" className="text-xs" />,
            onSelect: onSignOut,
            separated: true,
          },
        ]
      : []),
  ];

  return (
    <Dropdown
      align="end"
      label={ts("userMenu")}
      items={items}
      trigger={
        <button
          type="button"
          aria-label={ts("userMenu")}
          title={session.user.email}
          className="flex size-9 items-center justify-center rounded-full transition-colors duration-150 hover:bg-surface-strong"
        >
          <Avatar size="sm" className="size-7 text-[11px]">
            {initials(session.user.name, session.user.email)}
          </Avatar>
        </button>
      }
    />
  );
}

export function Topbar({
  crumbs = [],
  current,
  searchPlaceholder,
  searchable = true,
  actions,
  onMenuClick,
  onOpenPalette,
  onSignOut,
}: TopbarProps) {
  const { dark, toggleTheme } = useTheme();
  const session = usePanelSession();
  const t = useTranslations("common");
  const tp = useTranslations("palette");
  const shortcut = useShortcutLabel();
  const paletteLabel = searchPlaceholder ?? tp("open");
  const paletteTitle = `${paletteLabel} (${shortcut})`;

  const trail: Array<Crumb & { current?: boolean }> = current
    ? [...crumbs, { label: current, current: true }]
    : crumbs;

  const pageTitle = current ?? trail.at(-1)?.label ?? session.workspace.name;

  return (
    <header className="sticky top-0 z-sticky shrink-0 border-b border-border bg-canvas/80 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/70">
      <div className="page-container flex h-14 items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        {onMenuClick ? (
          <Button
            variant="ghost"
            icon
            size="sm"
            className="-ml-1.5 shrink-0 lg:hidden"
            aria-label={t("openMenu")}
            onClick={onMenuClick}
          >
            <Icon name="bars" className="text-sm" />
          </Button>
        ) : null}

        <Breadcrumbs items={trail} className="hidden min-w-0 shrink md:block" />

        <p className="m-0 min-w-0 flex-1 truncate text-[15px] font-semibold text-ink md:hidden">
          {pageTitle}
        </p>

        <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-1 sm:gap-1.5">
          {onOpenPalette && searchable ? (
            <button
              type="button"
              aria-haspopup="dialog"
              aria-keyshortcuts="Control+K Meta+K"
              title={paletteTitle}
              onClick={onOpenPalette}
              className="mr-1 hidden h-8.5 w-56 min-w-0 items-center gap-2 rounded-default border border-border bg-bg pr-1.5 pl-2.5 text-[13px] text-fg-subtle shadow-xs transition-colors duration-150 hover:border-border-strong hover:text-fg-muted md:flex lg:w-64"
            >
              <Icon name="search" className="text-xs" />
              <span className="min-w-0 flex-1 truncate text-left">{paletteLabel}</span>
              <Kbd className="hidden lg:inline-flex">{shortcut}</Kbd>
            </button>
          ) : null}
          {onOpenPalette ? (
            <Button
              variant="ghost"
              icon
              size="sm"
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

          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}

          <span className={cn("mx-1 hidden h-5 w-px bg-border sm:block", !actions && "sm:hidden")} aria-hidden="true" />

          {session.localeSwitcherEnabled ? (
            <span className="hidden sm:inline-flex">
              <LocaleSwitcher />
            </span>
          ) : null}
          <Button
            variant="ghost"
            icon
            size="sm"
            className="hidden sm:inline-flex"
            aria-label={dark ? t("themeLight") : t("themeDark")}
            title={dark ? t("themeLight") : t("themeDark")}
            onClick={toggleTheme}
          >
            <Icon name={dark ? "sun" : "moon"} className="text-sm" />
          </Button>
          <UserMenu onSignOut={onSignOut} />
        </div>
      </div>
    </header>
  );
}

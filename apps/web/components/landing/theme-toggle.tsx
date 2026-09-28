"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/kit/icon";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/cx";

/**
 * Public pages have no user menu, so the light/dark switch sits in the header.
 * The same `short-theme` cookie the panel reads is written, so the choice
 * carries over after sign-in.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { dark, toggleTheme } = useTheme();
  const t = useTranslations("common");
  const label = dark ? t("themeLight") : t("themeDark");

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-default text-fg-muted transition-colors hover:bg-surface hover:text-ink",
        className,
      )}
    >
      <Icon name={dark ? "sun" : "moon"} className="text-sm" />
    </button>
  );
}

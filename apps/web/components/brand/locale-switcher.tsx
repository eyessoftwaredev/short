"use client";

import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/kit/icon";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/i18n/locales";
import { writeClientCookie } from "@/lib/client-cookie";
import { cn } from "@/lib/cx";

const LOCALE_LABEL: Record<Locale, string> = {
  en: "EN",
  tr: "TR",
};

export function LocaleSwitcher({ invert = false }: { invert?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("common");

  const setLocale = (next: Locale): void => {
    writeClientCookie(LOCALE_COOKIE, next);
    window.location.reload();
  };

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-0.5 rounded-default border px-1",
        invert ? "border-on-inverse-border bg-on-inverse-soft" : "border-border bg-bg",
      )}
    >
      <Icon
        name="globe"
        className={cn("mx-1 shrink-0 text-xs", invert ? "text-on-inverse-dim" : "text-fg-subtle")}
        aria-hidden="true"
      />
      {LOCALES.map((item) => {
        const active = item === locale;
        return (
          <button
            key={item}
            type="button"
            aria-pressed={active}
            className={cn(
              "rounded-sm px-2 py-1 font-mono text-xs tracking-widest uppercase transition duration-200",
              active
                ? invert
                  ? "bg-on-inverse-soft text-on-inverse"
                  : "bg-accent-surface font-medium text-accent-on-surface"
                : invert
                  ? "text-on-inverse-dim hover:text-on-inverse"
                  : "text-fg-muted hover:bg-surface hover:text-ink",
            )}
            onClick={() => {
              setLocale(item);
            }}
          >
            {LOCALE_LABEL[item]}
          </button>
        );
      })}
    </div>
  );
}

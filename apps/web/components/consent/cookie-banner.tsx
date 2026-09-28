"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/kit/icon";
import { Button, Switch } from "@/components/ui";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  acceptAllConsent,
  defaultConsent,
  isPlatformPath,
  parseConsent,
  rejectOptionalConsent,
  serializeConsent,
  type ConsentState,
} from "@/lib/consent";
import { OPEN_COOKIE_SETTINGS_EVENT } from "./cookie-settings-button";

function readConsent(): ConsentState | null {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie.split("; ").find((part) => part.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) {
    return null;
  }
  return parseConsent(decodeURIComponent(match.slice(CONSENT_COOKIE.length + 1)));
}

function writeConsent(state: ConsentState): void {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(serializeConsent(state))}; path=/; max-age=${CONSENT_MAX_AGE}; samesite=lax${secure}`;
}

export function CookieBanner() {
  const pathname = usePathname();
  const t = useTranslations("legal");
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [draft, setDraft] = useState<ConsentState>(defaultConsent());

  useEffect(() => {
    const existing = readConsent();
    setReady(true);
    if (!existing) {
      setOpen(true);
      setDraft(defaultConsent());
      return;
    }
    setDraft(existing);
  }, []);

  // "Cookie settings" in the footer reopens the banner straight on the switches.
  useEffect(() => {
    const reopen = (): void => {
      setDraft(readConsent() ?? defaultConsent());
      setCustomize(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
  }, []);

  if (!ready || !open || !isPlatformPath(pathname)) {
    return null;
  }

  const persist = (state: ConsentState): void => {
    writeConsent(state);
    setDraft(state);
    setOpen(false);
    setCustomize(false);
  };

  const categories = [
    { id: "analytics", title: t("analyticsTitle"), body: t("analyticsBody") },
    { id: "marketing", title: t("marketingTitle"), body: t("marketingBody") },
  ] as const;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-toast p-3 sm:p-4"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-body"
    >
      <div className="animate-slide-in-up pointer-events-auto mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-4 rounded-lg border border-border bg-elevated p-4 shadow-toast sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="hidden size-9 shrink-0 items-center justify-center rounded-default bg-accent-surface text-accent-on-surface sm:flex"
            aria-hidden="true"
          >
            <Icon name="shield" className="text-sm" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <p id="cookie-banner-title" className="m-0 text-sm font-semibold text-ink">
              {t("bannerTitle")}
            </p>
            <p id="cookie-banner-body" className="m-0 text-[13px] leading-relaxed text-fg-muted">
              {t("bannerBody")}{" "}
              <Link href="/cookies" className="font-medium">
                {t("cookiesTitle")}
              </Link>
            </p>
          </div>
        </div>

        {customize ? (
          <fieldset className="m-0 flex min-w-0 flex-col divide-y divide-border-subtle rounded-md border border-border-subtle p-0">
            <legend className="sr-only">{t("customize")}</legend>
            <div className="flex min-w-0 items-start justify-between gap-4 px-3.5 py-3">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium text-ink">{t("necessaryTitle")}</span>
                <span className="text-xs leading-relaxed text-fg-muted">{t("necessaryBody")}</span>
              </span>
              <span className="shrink-0 text-xs font-medium text-fg-subtle">{t("alwaysOn")}</span>
            </div>
            {categories.map((category) => (
              <div key={category.id} className="flex min-w-0 items-start justify-between gap-4 px-3.5 py-3">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium text-ink">{category.title}</span>
                  <span className="text-xs leading-relaxed text-fg-muted">{category.body}</span>
                </span>
                <Switch
                  aria-label={category.title}
                  checked={draft[category.id]}
                  onCheckedChange={(checked) =>
                    setDraft({ ...draft, [category.id]: checked, necessary: true })
                  }
                />
              </div>
            ))}
          </fieldset>
        ) : null}

        <div className="flex min-w-0 flex-wrap justify-end gap-2">
          {customize ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => persist(rejectOptionalConsent())}>
                {t("rejectOptional")}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => persist({ ...draft, necessary: true, ts: Date.now() })}
              >
                {t("saveChoices")}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCustomize(true);
                }}
              >
                {t("customize")}
              </Button>
              <Button size="sm" onClick={() => persist(rejectOptionalConsent())}>
                {t("rejectOptional")}
              </Button>
              <Button variant="primary" size="sm" onClick={() => persist(acceptAllConsent())}>
                {t("acceptAll")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

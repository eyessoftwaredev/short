"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(serializeConsent(state))}; path=/; max-age=${CONSENT_MAX_AGE}; samesite=lax`;
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

  if (!ready || !open || !isPlatformPath(pathname)) {
    return null;
  }

  const persist = (state: ConsentState): void => {
    writeConsent(state);
    setDraft(state);
    setOpen(false);
    setCustomize(false);
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-toast p-4"
      role="dialog"
      aria-labelledby="cookie-banner-title"
    >
      <div className="pointer-events-auto mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-4 rounded-default border border-border bg-bg p-4 shadow-toast">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p id="cookie-banner-title" className="m-0 text-sm font-semibold text-ink">
            {t("bannerTitle")}
          </p>
          <p className="m-0 text-sm leading-relaxed text-fg-muted">{t("bannerBody")}</p>
        </div>

        {customize ? (
          <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
            <legend className="sr-only">{t("customize")}</legend>
            <div className="flex min-w-0 items-start justify-between gap-4">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium text-ink">{t("necessaryTitle")}</span>
                <span className="text-xs leading-relaxed text-fg-muted">{t("necessaryBody")}</span>
              </span>
              <span className="shrink-0 font-mono text-xs tracking-widest text-fg-subtle uppercase">
                {t("alwaysOn")}
              </span>
            </div>
            <div className="flex min-w-0 items-start justify-between gap-4">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium text-ink">{t("analyticsTitle")}</span>
                <span className="text-xs leading-relaxed text-fg-muted">{t("analyticsBody")}</span>
              </span>
              <Switch
                checked={draft.analytics}
                onCheckedChange={(checked) => setDraft({ ...draft, analytics: checked, necessary: true })}
              />
            </div>
            <div className="flex min-w-0 items-start justify-between gap-4">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium text-ink">{t("marketingTitle")}</span>
                <span className="text-xs leading-relaxed text-fg-muted">{t("marketingBody")}</span>
              </span>
              <Switch
                checked={draft.marketing}
                onCheckedChange={(checked) => setDraft({ ...draft, marketing: checked, necessary: true })}
              />
            </div>
          </fieldset>
        ) : null}

        <div className="flex min-w-0 flex-wrap gap-2">
          {customize ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => persist({ ...draft, necessary: true, ts: Date.now() })}
            >
              {t("saveChoices")}
            </Button>
          ) : (
            <>
              <Button variant="primary" size="sm" onClick={() => persist(acceptAllConsent())}>
                {t("acceptAll")}
              </Button>
              <Button size="sm" onClick={() => persist(rejectOptionalConsent())}>
                {t("rejectOptional")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCustomize(true);
                }}
              >
                {t("customize")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

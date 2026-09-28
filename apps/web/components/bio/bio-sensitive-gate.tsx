"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cx";

type BioSensitiveGateProps = {
  pageId: string;
  /** The page's palette, so the warning screen already looks like the page behind it. */
  theme: string;
  surfaceStyle?: CSSProperties;
  fontFamily?: string;
  themedBackground?: boolean;
  children: ReactNode;
};

/**
 * Warning screen in front of a page marked as sensitive. The choice is remembered for
 * the browser session, so a visitor confirms once per page.
 */
export function BioSensitiveGate({
  pageId,
  theme,
  surfaceStyle,
  fontFamily,
  themedBackground = true,
  children,
}: BioSensitiveGateProps) {
  const t = useTranslations("bio.public");
  const storageKey = `bio-nsfw:${pageId}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey) === "1") {
        setOpen(true);
      }
    } catch {
      /* storage blocked: keep the gate */
    }
  }, [storageKey]);

  if (open) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn(
        `bio-theme-${theme}`,
        "flex min-h-dvh flex-col items-center justify-center bg-bio-bg px-6 py-16 text-center text-bio-fg antialiased",
        themedBackground && "bg-[radial-gradient(130%_60%_at_50%_0%,var(--bio-bg-alt)_0%,transparent_72%)]",
      )}
      style={{ fontFamily, ...surfaceStyle }}
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl border border-bio-border bg-bio-card p-7 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.25)]">
        <span
          className="flex size-12 items-center justify-center rounded-full bg-bio-accent text-bio-on-accent"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="2.75" />
            <path d="M4 20 20 4" strokeLinecap="round" />
          </svg>
        </span>
        <h1 className="m-0 text-xl leading-7 font-bold tracking-[-0.01em]">{t("sensitiveTitle")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-bio-fg-muted">{t("sensitiveBody")}</p>
        <button
          type="button"
          className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-bio-accent bg-bio-accent px-5 text-[15px] font-semibold text-bio-on-accent transition-transform duration-150 active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bio-accent"
          onClick={() => {
            try {
              sessionStorage.setItem(storageKey, "1");
            } catch {
              /* private mode */
            }
            setOpen(true);
          }}
        >
          {t("sensitiveContinue")}
        </button>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-xl border-0 bg-transparent px-4 text-sm font-medium text-bio-fg-muted hover:text-bio-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bio-accent"
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              window.location.href = "about:blank";
            }
          }}
        >
          {t("sensitiveLeave")}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { BrandLockup } from "@/components/brand/brand-mark";
import { Icon } from "@/components/kit/icon";
import { Button } from "@/components/ui";
import { FALLBACK_BRAND } from "@/lib/brand-fallback";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  const tc = useTranslations("common");
  const tl = useTranslations("legal");

  useEffect(() => {
    console.error("app render failed", error);
  }, [error]);

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-canvas">
      <header className="flex min-w-0 items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <BrandLockup name={FALLBACK_BRAND.name} href="/" logoSrc="/api/brand/logo" hasWordmark={false} />
      </header>

      <main id="main" className="flex min-w-0 flex-1 items-center justify-center px-5 py-16">
        <div className="flex w-full max-w-lg min-w-0 flex-col items-center gap-5 text-center">
          <span
            className="flex size-14 items-center justify-center rounded-xl bg-danger-surface text-danger"
            aria-hidden="true"
          >
            <Icon name="warning" className="text-xl" />
          </span>
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-balance text-ink sm:text-3xl">
            {t("pageError")}
          </h1>
          <p className="m-0 text-[15px] leading-relaxed text-fg-muted">{t("pageErrorBody")}</p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <Button variant="primary" size="lg" leadingIcon="rotate-right" onClick={reset}>
              {tc("tryAgain")}
            </Button>
            <Button size="lg" href="/" leadingIcon="house">
              {tl("backHome")}
            </Button>
          </div>
          {error.digest ? (
            <>
              <code className="rounded-xs bg-surface px-2 py-1 font-mono text-xs text-fg-muted">
                {tc("errorRef", { digest: error.digest })}
              </code>
              <p className="m-0 max-w-sm text-[13px] leading-relaxed text-fg-subtle">{t("pageErrorHint")}</p>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}

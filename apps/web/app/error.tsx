"use client";

import { Icon } from "@/components/kit/icon";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { BrandLockup } from "@/components/brand/brand-mark";
import { Button, EmptyState } from "@/components/ui";
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

  useEffect(() => {
    console.error("app render failed", error);
  }, [error]);

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-bg">
      <header className="flex min-w-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
        <BrandLockup
          name={FALLBACK_BRAND.name}
          href="/"
          logoSrc="/api/brand/logo"
          hasWordmark={false}
        />
      </header>

      <main className="flex min-w-0 flex-1 items-center justify-center px-6 py-16">
        <EmptyState
          className="w-full max-w-lg"
          icon={<Icon name="warning" className="text-lg" />}
          eyebrow={error.digest ? tc("errorRef", { digest: error.digest }) : tc("error")}
          title={t("pageError")}
          description={t("pageErrorBody")}
          actions={
            <>
              <Button variant="primary" onClick={reset}>
                <Icon name="rotate-right" className="text-sm" />
                {tc("tryAgain")}
              </Button>
              <Button href="/dashboard">{tc("goToDashboard")}</Button>
            </>
          }
          hint={t("pageErrorHint")}
        />
      </main>
    </div>
  );
}

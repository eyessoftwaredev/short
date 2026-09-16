"use client";

import { Icon } from "@/components/kit/icon";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { PanelShell } from "@/components/shell/panel-shell";
import { Button, EmptyState } from "@/components/ui";

export default function LinksError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("links");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");

  useEffect(() => {
    console.error("links list failed to render", error);
  }, [error]);

  return (
    <PanelShell title={tn("links")} searchable={false}>
      <EmptyState
        icon={<Icon name="warning" className="text-lg" />}
        eyebrow={error.digest ? tc("errorRef", { digest: error.digest }) : undefined}
        title={t("loadError")}
        /*
         * Reassurance first: the instinct on a links screen is that the links
         * themselves are gone, and redirects run from a separate service.
         */
        description={t("loadErrorBody")}
        actions={
          <>
            <Button variant="primary" onClick={reset}>
              <Icon name="rotate-right" className="text-sm" />
              {tc("tryAgain")}
            </Button>
            <Button href="/dashboard">{tc("goToDashboard")}</Button>
          </>
        }
        hint={t("loadErrorHint")}
      />
    </PanelShell>
  );
}

"use client";

import { Icon } from "@/components/kit/icon";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { PanelShell } from "@/components/shell/panel-shell";
import { Button, EmptyState } from "@/components/ui";

/**
 * The dashboard reads from Postgres and ClickHouse. The analytics loaders
 * already swallow a ClickHouse outage and degrade to zeroes, so reaching this
 * boundary means the workspace query itself failed — retrying is worth
 * offering, but the copy does not promise it will help.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("panel");
  const tc = useTranslations("common");

  useEffect(() => {
    console.error("dashboard failed to render", error);
  }, [error]);

  return (
    <PanelShell title={t("dashboard")}>
      <EmptyState
        icon={<Icon name="warning" className="text-lg" />}
        eyebrow={error.digest ? tc("errorRef", { digest: error.digest }) : undefined}
        title={t("dashboardLoadError")}
        description={t("dashboardLoadErrorBody")}
        actions={
          <>
            <Button variant="primary" onClick={reset}>
              <Icon name="rotate-right" className="text-sm" />
              {tc("tryAgain")}
            </Button>
            <Button href="/links">{tc("goToLinks")}</Button>
          </>
        }
        hint={t("loadErrorHint")}
      />
    </PanelShell>
  );
}

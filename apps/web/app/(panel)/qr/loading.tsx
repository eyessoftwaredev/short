import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Grid, Skeleton } from "@/components/ui";

/**
 * Mirrors the QR list: header with the create button, the filter row and a grid of
 * code cards (thumbnail, badge, name, link, footer strip).
 */
export default async function QrLoading() {
  const t = await getTranslations("qr");
  return (
    <PanelShell title={t("title")} searchable={false}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4" aria-hidden="true">
        <div className="flex min-w-0 flex-col gap-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-9.5 w-40 rounded-default" />
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-3" aria-hidden="true">
        <Skeleton className="h-9.5 max-w-md min-w-52 flex-1 rounded-default" />
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-24 rounded-pill" />
        ))}
      </div>

      <Grid columns={3} className="xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-bg shadow-card"
          >
            <div className="flex justify-center border-b border-border-subtle bg-surface px-6 py-5">
              <Skeleton className="aspect-square w-full max-w-44 rounded-sm" />
            </div>
            <div className="flex flex-col gap-2.5 px-4 py-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
            <div className="flex justify-between border-t border-border-subtle bg-surface-subtle px-5 py-3">
              <Skeleton className="h-8 w-16 rounded-default" />
              <Skeleton className="h-8 w-28 rounded-default" />
            </div>
          </div>
        ))}
      </Grid>
    </PanelShell>
  );
}

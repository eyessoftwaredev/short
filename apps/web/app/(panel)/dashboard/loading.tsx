import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Grid, Skeleton, SkeletonCard, SkeletonChart, SkeletonTable } from "@/components/ui";

/**
 * Rendered inside the real shell, so the sidebar, topbar and page rhythm are
 * already in place and only the data region swaps. Every block below mirrors
 * the element it stands in for — PageHeader, four StatCards, the trend card,
 * two detail cards — which is what stops the layout jumping when the
 * ClickHouse queries land.
 */
export default async function DashboardLoading() {
  const t = await getTranslations("panel");
  return (
    <PanelShell title={t("dashboard")}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4" aria-hidden="true">
        <div className="flex min-w-0 flex-col gap-2.5">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex shrink-0 gap-2">
          <Skeleton className="h-8 w-32 rounded-default" />
          <Skeleton className="h-9.5 w-28 rounded-default" />
        </div>
      </div>

      <Grid columns={4}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </Grid>

      <div className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-bg p-5 shadow-card" aria-hidden="true">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3.5 w-56" />
        </div>
        <SkeletonChart />
      </div>

      <Grid columns={2}>
        <SkeletonTable rows={6} columns={3} />
        <SkeletonTable rows={6} columns={2} header={false} />
      </Grid>
    </PanelShell>
  );
}

import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Grid, Skeleton, SkeletonCard, SkeletonChart, SkeletonText } from "@/components/ui";

/**
 * A link's page waits on several ClickHouse queries. The skeleton mirrors it block for
 * block — header, short-link and details cards, filters, four stat tiles, the chart —
 * so nothing jumps when the numbers land.
 */
export default async function LinkStatsLoading() {
  const ts = await getTranslations("stats");
  return (
    <PanelShell title={ts("statistics")}>
      <div className="flex min-w-0 flex-col gap-4" aria-hidden="true">
        <Skeleton className="h-4 w-16" />
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2.5">
            <Skeleton className="h-7 w-64 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="flex shrink-0 gap-2">
            <Skeleton className="h-9.5 w-24 rounded-default" />
            <Skeleton className="h-9.5 w-28 rounded-default" />
            <Skeleton className="h-9.5 w-28 rounded-default" />
          </div>
        </div>
      </div>

      <Grid columns={2}>
        <div className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-bg p-5 shadow-card" aria-hidden="true">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9.5 w-full rounded-default" />
          <Skeleton className="h-8 w-full rounded-default" />
        </div>
        <div className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-bg p-5 shadow-card" aria-hidden="true">
          <Skeleton className="h-4 w-24" />
          <SkeletonText lines={4} />
        </div>
      </Grid>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3" aria-hidden="true">
        <div className="flex gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-20 rounded-pill" />
          ))}
        </div>
        <Skeleton className="h-8 w-44 rounded-default" />
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
    </PanelShell>
  );
}

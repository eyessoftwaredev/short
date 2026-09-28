import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Grid, Skeleton, SkeletonCard, SkeletonChart } from "@/components/ui";

/** Mirrors the bio stats screen: header, four tiles, the activity chart. */
export default async function BioStatsLoading() {
  const t = await getTranslations("stats");
  return (
    <PanelShell title={t("statistics")} contentClassName="gap-8">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4" aria-hidden="true">
        <div className="flex min-w-0 flex-col gap-2.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28 rounded-default" />
          <Skeleton className="h-8 w-24 rounded-default" />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <Grid columns={4}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </Grid>
        <div className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-bg p-5 shadow-card" aria-hidden="true">
          <Skeleton className="h-4 w-36" />
          <SkeletonChart />
        </div>
      </div>
    </PanelShell>
  );
}

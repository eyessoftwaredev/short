import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Grid, Skeleton, SkeletonCard, SkeletonChart, SkeletonTable } from "@/components/ui";

const CARD = "flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-bg p-5 shadow-card";

/**
 * Analytics fans out into a summary, a timeseries, eleven breakdown queries and two
 * rankings. The placeholder mirrors the page block for block — header, filter bar,
 * two KPI rows, chart, breakdowns, tables — so it settles once instead of jolting.
 */
export default async function AnalyticsLoading() {
  const t = await getTranslations("nav");
  return (
    <PanelShell title={t("analytics")}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4" aria-hidden="true">
        <div className="flex min-w-0 flex-col gap-2.5">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex shrink-0 gap-2">
          <Skeleton className="h-8 w-28 rounded-default" />
          <Skeleton className="h-8 w-32 rounded-default" />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-bg p-4 shadow-card" aria-hidden="true">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-9.5 w-full rounded-default" />
            </div>
          ))}
        </div>
      </div>

      <Grid columns={4}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </Grid>
      <Grid columns={4}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </Grid>

      <div className={CARD} aria-hidden="true">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <SkeletonChart height="lg" />
      </div>

      <section className="flex min-w-0 flex-col gap-3" aria-hidden="true">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-72 rounded-default" />
        <Grid columns={3}>
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className={CARD}>
              <Skeleton className="h-4 w-24" />
              {Array.from({ length: 5 }, (_, row) => (
                <div key={row} className="flex items-center gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-default" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-1.5 w-full rounded-pill" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </Grid>
      </section>

      <SkeletonTable rows={8} columns={5} />
      <SkeletonTable rows={8} columns={6} />
    </PanelShell>
  );
}

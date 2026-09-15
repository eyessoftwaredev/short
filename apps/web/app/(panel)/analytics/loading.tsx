import { PanelShell } from "@/components/shell/panel-shell";
import { Grid, Skeleton, SkeletonCard, SkeletonChart, SkeletonTable } from "@/components/ui";

/**
 * Analytics fans out into a summary, a timeseries, eleven breakdown queries
 * and a top-links ranking. The placeholder reserves the full shape up front so
 * the page settles once rather than in four separate jolts.
 */
export default function AnalyticsLoading() {
  return (
    <PanelShell title="Analytics">
      <div
        className="flex min-w-0 flex-wrap items-start justify-between gap-5 rounded-default border border-border bg-bg px-6 py-5"
        aria-hidden="true"
      >
        <div className="flex min-w-0 flex-col gap-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex shrink-0 gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-20 rounded-pill" />
          ))}
        </div>
      </div>

      <Grid columns={4}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </Grid>

      <section className="flex min-w-0 flex-col gap-4">
        <Skeleton className="h-5 w-40" />
        <div className="rounded-default border border-border bg-bg p-5">
          <SkeletonChart height="lg" />
        </div>
      </section>

      <section className="flex min-w-0 flex-col gap-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-64 rounded-default" />
        <Grid columns={3}>
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="flex min-w-0 flex-col gap-4 rounded-default border border-border bg-bg p-5"
            >
              <Skeleton className="h-3 w-24" />
              {Array.from({ length: 5 }, (_, row) => (
                <div key={row} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-1.5 w-full rounded-pill" />
                </div>
              ))}
            </div>
          ))}
        </Grid>
      </section>

      <section className="flex min-w-0 flex-col gap-4">
        <Skeleton className="h-5 w-28" />
        <SkeletonTable rows={8} columns={5} />
      </section>
    </PanelShell>
  );
}

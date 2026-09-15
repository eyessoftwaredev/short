import { PanelShell } from "@/components/shell/panel-shell";
import { Grid, Skeleton, SkeletonCard, SkeletonChart, SkeletonTable } from "@/components/ui";

/**
 * Rendered inside the real shell, so the sidebar, topbar and page rhythm are
 * already in place and only the data region swaps. Every block below mirrors
 * the element it stands in for, which is what stops the layout jumping when
 * the ClickHouse queries land.
 */
export default function DashboardLoading() {
  return (
    <PanelShell title="Dashboard">
      <div
        className="flex min-w-0 flex-wrap items-start justify-between gap-5 rounded-default border border-border bg-bg px-6 py-5"
        aria-hidden="true"
      >
        <div className="flex min-w-0 flex-col gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80" />
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
        <Skeleton className="h-5 w-32" />
        <div className="rounded-default border border-border bg-bg p-5">
          <SkeletonChart />
        </div>
      </section>

      <Grid columns={2}>
        <section className="flex min-w-0 flex-col gap-4">
          <Skeleton className="h-5 w-28" />
          <SkeletonTable rows={6} columns={3} />
        </section>
        <section className="flex min-w-0 flex-col gap-4">
          <Skeleton className="h-5 w-32" />
          <SkeletonTable rows={6} columns={2} header={false} />
        </section>
      </Grid>
    </PanelShell>
  );
}

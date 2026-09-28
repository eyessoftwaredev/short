import { Skeleton, SkeletonCard, SkeletonChart } from "@/components/ui";

/** Mirrors ShareChrome + the report: header bar, title block, range tabs, three KPIs, chart. */
export default function ShareLoading() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-canvas" aria-hidden="true">
      <div className="border-b border-border bg-bg">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-6 w-20 rounded-pill" />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-96 max-w-full rounded-default" />
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-bg p-5 shadow-card">
          <Skeleton className="h-4 w-36" />
          <SkeletonChart />
        </div>
      </div>
    </div>
  );
}

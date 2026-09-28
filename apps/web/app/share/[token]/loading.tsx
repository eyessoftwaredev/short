import { Skeleton, SkeletonCard, SkeletonChart } from "@/components/ui";

export default function ShareLoading() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-bg">
      <div className="border-b border-border px-4 py-4 sm:px-6">
        <Skeleton className="h-7 w-28" />
      </div>
      <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6 px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-2/3" />
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonChart />
      </div>
    </div>
  );
}

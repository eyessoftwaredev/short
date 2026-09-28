import { Skeleton } from "@/components/ui";

/** Loading shape of the QR designer: header, numbered section cards, sticky preview. */
export function QrDesignerSkeleton() {
  return (
    <>
      <div className="flex min-w-0 flex-col gap-3" aria-hidden="true">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_26rem]" aria-hidden="true">
        <div className="flex min-w-0 flex-col gap-6">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex flex-col gap-4 rounded-lg border border-border bg-bg p-5 shadow-card">
              <div className="flex items-center gap-3">
                <Skeleton className="size-7 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-9.5 w-full rounded-default" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-20 w-full rounded-md" />
                <Skeleton className="h-20 w-full rounded-md" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden flex-col gap-4 rounded-lg border border-border bg-bg p-5 shadow-card xl:flex">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="aspect-square w-full rounded-md" />
          <Skeleton className="h-9.5 w-full rounded-default" />
        </div>
      </div>
    </>
  );
}

import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Skeleton, SkeletonTable } from "@/components/ui";

/**
 * The links list waits on Postgres and on a ClickHouse click-count query, so
 * it is the slowest of the member screens. The skeleton reproduces the header,
 * filter row and table chrome exactly, which keeps the page from reflowing
 * when the rows arrive.
 */
export default async function LinksLoading() {
  const tn = await getTranslations("nav");
  return (
    <PanelShell title={tn("links")} searchable={false}>
      <div
        className="flex min-w-0 flex-wrap items-start justify-between gap-5 rounded-default border border-border bg-bg px-6 py-5"
        aria-hidden="true"
      >
        <div className="flex min-w-0 flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-9 w-28 rounded-default" />
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-3" aria-hidden="true">
        <Skeleton className="h-9 min-w-52 flex-1 rounded-default" />
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-20 rounded-pill" />
        ))}
      </div>

      <SkeletonTable rows={8} columns={6} />
    </PanelShell>
  );
}

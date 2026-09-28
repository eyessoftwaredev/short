import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Skeleton, SkeletonTable } from "@/components/ui";

/**
 * The links list waits on Postgres and on a ClickHouse click-total query, so it is the
 * slowest of the member screens. The skeleton mirrors the page header, the filter rows
 * and the table so nothing jumps when the rows arrive.
 */
export default async function LinksLoading() {
  const tn = await getTranslations("nav");
  return (
    <PanelShell title={tn("links")} searchable={false}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4" aria-hidden="true">
        <div className="flex min-w-0 flex-col gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9.5 w-24 rounded-default" />
          <Skeleton className="h-9.5 w-32 rounded-default" />
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3" aria-hidden="true">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Skeleton className="h-9.5 max-w-md min-w-52 flex-1 rounded-default" />
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-20 rounded-pill" />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-40 rounded-default" />
          <Skeleton className="h-8 w-32 rounded-default" />
          <Skeleton className="h-8 w-32 rounded-default" />
        </div>
      </div>

      <SkeletonTable rows={8} columns={5} />
    </PanelShell>
  );
}

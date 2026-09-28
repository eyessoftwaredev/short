import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Skeleton, SkeletonText } from "@/components/ui";

/**
 * Billing waits on Stripe and ClickHouse, so the skeleton mirrors the page:
 * header, plan card beside the usage meters, then the plan cards.
 */
export default async function BillingLoading() {
  const t = await getTranslations("billing");
  return (
    <PanelShell title={t("title")}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4" aria-hidden="true">
        <div className="flex min-w-0 flex-col gap-2.5">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9.5 w-36 rounded-default" />
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]" aria-hidden="true">
        <div className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-bg p-5 shadow-card">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-24" />
          <SkeletonText lines={3} />
        </div>
        <div className="flex min-w-0 flex-col gap-5 rounded-lg border border-border bg-bg p-5 shadow-card">
          <Skeleton className="h-4 w-40" />
          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex flex-col gap-2">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-1.5 w-full rounded-pill" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-bg p-5 shadow-card">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-9.5 w-full rounded-default" />
            <SkeletonText lines={5} />
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

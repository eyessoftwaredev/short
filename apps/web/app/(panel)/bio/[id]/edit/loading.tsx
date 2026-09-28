import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Skeleton } from "@/components/ui";

/** Mirrors the builder: header, tab row and block list on the left, phone on the right. */
export default async function BioBuilderLoading() {
  const t = await getTranslations("bio");
  return (
    <PanelShell title={t("editTitle")}>
      <div className="flex min-w-0 flex-col gap-3" aria-hidden="true">
        <Skeleton className="h-4 w-24" />
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2.5">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-44" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9.5 w-24 rounded-default" />
            <Skeleton className="h-9.5 w-28 rounded-default" />
          </div>
        </div>
      </div>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] xl:grid-cols-[minmax(0,1fr)_22rem]" aria-hidden="true">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex gap-6 border-b border-border pb-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-bg p-5 shadow-card">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3.5 w-72 max-w-full" />
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-14 w-full rounded-md" />
            ))}
          </div>
        </div>
        <div className="hidden lg:block">
          <Skeleton className="mx-auto h-[37rem] w-full max-w-[20rem] rounded-[2.75rem]" />
        </div>
      </div>
    </PanelShell>
  );
}

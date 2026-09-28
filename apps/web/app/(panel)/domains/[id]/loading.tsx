import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Skeleton, SkeletonText } from "@/components/ui";

/** Mirrors the detail page: back link + title, the steps row and two stacked cards. */
export default async function DomainDetailLoading() {
  const t = await getTranslations("domains");
  return (
    <PanelShell title={t("title")}>
      <div className="flex min-w-0 flex-col gap-3" aria-hidden="true">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex min-w-0 items-center gap-3" aria-hidden="true">
        <Skeleton className="size-7 rounded-full" />
        <Skeleton className="h-px flex-1" />
        <Skeleton className="size-7 rounded-full" />
        <Skeleton className="h-px flex-1" />
        <Skeleton className="size-7 rounded-full" />
      </div>
      {[0, 1].map((index) => (
        <div
          key={index}
          className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-bg p-5 shadow-card"
          aria-hidden="true"
        >
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3.5 w-72 max-w-full" />
          </div>
          <SkeletonText lines={3} />
        </div>
      ))}
    </PanelShell>
  );
}

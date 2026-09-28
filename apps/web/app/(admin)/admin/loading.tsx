import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Skeleton, SkeletonTable } from "@/components/ui";

/**
 * Most admin screens are a header, a filter row and a table, so that is the shape
 * shown while a query runs. Screens with a different layout bring their own.
 */
export default async function AdminLoading() {
  const t = await getTranslations("admin.nav");
  return (
    <PanelShell title={t("admin")}>
      <div className="flex min-w-0 flex-col gap-2.5" aria-hidden="true">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-3" aria-hidden="true">
        <Skeleton className="h-9.5 w-72 max-w-full rounded-default" />
        <Skeleton className="h-8 w-16 rounded-pill" />
        <Skeleton className="h-8 w-20 rounded-pill" />
        <Skeleton className="h-8 w-20 rounded-pill" />
      </div>
      <SkeletonTable rows={8} columns={5} />
    </PanelShell>
  );
}

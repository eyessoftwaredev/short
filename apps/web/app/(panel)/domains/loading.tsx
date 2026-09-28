import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Skeleton, SkeletonTable } from "@/components/ui";

/** Mirrors the list: PageHeader with a primary action, then the domains table. */
export default async function DomainsLoading() {
  const t = await getTranslations("domains");
  return (
    <PanelShell title={t("title")}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4" aria-hidden="true">
        <div className="flex min-w-0 flex-col gap-2.5">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-9.5 w-32 rounded-default" />
      </div>
      <SkeletonTable rows={4} columns={4} />
    </PanelShell>
  );
}

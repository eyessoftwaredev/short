import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Grid, Skeleton, SkeletonCard, SkeletonText } from "@/components/ui";

/** Every dependency is probed live, so this page is the slowest in admin: mirror it. */
export default async function AdminSystemLoading() {
  const t = await getTranslations("admin.system");
  return (
    <PanelShell title={t("title")}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4" aria-hidden="true">
        <div className="flex min-w-0 flex-col gap-2.5">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-9.5 w-28 rounded-default" />
      </div>
      <Skeleton className="h-14 w-full rounded-md" />
      <Grid columns={3}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </Grid>
      <div className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-bg p-5 shadow-card" aria-hidden="true">
        <Skeleton className="h-4 w-32" />
        <SkeletonText lines={5} />
      </div>
    </PanelShell>
  );
}

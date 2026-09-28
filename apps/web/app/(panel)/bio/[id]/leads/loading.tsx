import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Grid, Skeleton, SkeletonCard, SkeletonTable } from "@/components/ui";

/** Mirrors the leads screen: header, three stat tiles, the table. */
export default async function BioLeadsLoading() {
  const t = await getTranslations("bio");
  return (
    <PanelShell title={t("leadsTitle")}>
      <div className="flex min-w-0 flex-col gap-3" aria-hidden="true">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Grid columns={3}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </Grid>
      <SkeletonTable rows={6} columns={3} />
    </PanelShell>
  );
}

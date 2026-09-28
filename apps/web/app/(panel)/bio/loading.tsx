import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Grid, Skeleton } from "@/components/ui";

/** Mirrors the bio list: header, then a grid of preview cards. */
export default async function BioListLoading() {
  const t = await getTranslations("bio");
  return (
    <PanelShell title={t("title")}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4" aria-hidden="true">
        <div className="flex min-w-0 flex-col gap-2.5">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-9.5 w-36 rounded-default" />
      </div>
      <Grid columns={3}>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-bg shadow-card"
            aria-hidden="true"
          >
            <Skeleton className="h-44 rounded-none" />
            <div className="flex flex-col gap-3 p-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-8 w-full rounded-default" />
            </div>
            <div className="flex gap-2 border-t border-border-subtle bg-surface-subtle px-5 py-3">
              <Skeleton className="h-8 w-20 rounded-default" />
              <Skeleton className="h-8 w-20 rounded-default" />
            </div>
          </div>
        ))}
      </Grid>
    </PanelShell>
  );
}

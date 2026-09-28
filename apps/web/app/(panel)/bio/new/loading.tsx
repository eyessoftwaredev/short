import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Skeleton } from "@/components/ui";

/** Mirrors the create flow: header, steps, then the template grid. */
export default async function NewBioLoading() {
  const t = await getTranslations("bio");
  return (
    <PanelShell title={t("newTitle")}>
      <div className="flex min-w-0 flex-col gap-3" aria-hidden="true">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex gap-3" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-7 flex-1 rounded-default" />
        ))}
      </div>
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-bg p-5 shadow-card" aria-hidden="true">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-56 rounded-lg" />
          ))}
        </div>
      </div>
    </PanelShell>
  );
}

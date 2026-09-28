import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Skeleton } from "@/components/ui";

/** Header, tab row and two SectionCards of SettingsRows — the shape every tab starts with. */
export default async function SettingsLoading() {
  const t = await getTranslations("settings");
  return (
    <PanelShell title={t("title")}>
      <div className="flex min-w-0 flex-col gap-5" aria-hidden="true">
        <div className="flex min-w-0 flex-col gap-2.5">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex gap-6 overflow-hidden border-b border-border pb-3">
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className="h-4 w-20 shrink-0" />
          ))}
        </div>
      </div>
      {Array.from({ length: 2 }, (_, card) => (
        <div
          key={card}
          className="flex w-full max-w-4xl min-w-0 flex-col rounded-lg border border-border bg-bg shadow-card"
          aria-hidden="true"
        >
          <div className="flex flex-col gap-2 border-b border-border-subtle px-6 py-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3.5 w-72 max-w-full" />
          </div>
          {Array.from({ length: 3 }, (_, row) => (
            <div
              key={row}
              className="grid gap-3 border-b border-border-subtle px-6 py-5 last:border-b-0 md:grid-cols-[2fr_3fr]"
            >
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-48 max-w-full" />
              </div>
              <Skeleton className="h-9.5 w-full rounded-default" />
            </div>
          ))}
        </div>
      ))}
    </PanelShell>
  );
}

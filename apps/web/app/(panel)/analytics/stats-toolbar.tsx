import type { ReactNode } from "react";
import type { RangeKey } from "@/lib/stats";
import { RangePicker } from "@/components/charts/range-picker";
import { ExportButtons } from "./export-buttons";
import { StatsToggles } from "./stats-toggles";

type StatsToolbarProps = {
  range: RangeKey;
  exportHref: string;
  leading?: ReactNode;
};

export function StatsToolbar({ range, exportHref, leading }: StatsToolbarProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-default border border-border bg-surface p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        {leading}
        <ExportButtons href={exportHref} />
        <RangePicker value={range} />
      </div>
      <StatsToggles />
    </div>
  );
}

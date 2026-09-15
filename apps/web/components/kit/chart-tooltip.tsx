"use client";

import type { ReactNode } from "react";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { formatCompact } from "./chart-theme";

type ChartTooltipOptions = {
  valueFormatter?: (value: number, name: string) => string;
  formatLabel?: (label: string) => string;
  /** Adds a summed row under the series — useful on stacked charts. */
  showTotal?: boolean;
  totalLabel?: string;
  /** Static note under the rows, e.g. "excludes bot traffic". */
  footer?: ReactNode;
};

type ChartTooltipProps = Pick<TooltipContentProps<ValueType, NameType>, "active" | "payload" | "label"> &
  ChartTooltipOptions;

export function createChartTooltip(options: ChartTooltipOptions = {}) {
  return function ChartTooltipContent(props: TooltipContentProps<ValueType, NameType>) {
    return <ChartTooltip active={props.active} payload={props.payload} label={props.label} {...options} />;
  };
}

export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
  formatLabel,
  showTotal = false,
  totalLabel = "Total",
  footer,
}: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const displayLabel = formatLabel && label != null ? formatLabel(String(label)) : label;
  let total = 0;

  return (
    <div className="kit-chart-tooltip" role="tooltip">
      {displayLabel != null && displayLabel !== "" ? (
        <div className="kit-chart-tooltip__label">{displayLabel}</div>
      ) : null}
      <div className="kit-chart-tooltip__rows">
        {payload.map((entry, index) => {
          const raw = entry.value;
          const num = typeof raw === "number" ? raw : Number(raw);
          const name = String(entry.name ?? entry.dataKey ?? "");
          if (Number.isFinite(num)) {
            total += num;
          }
          const formatted =
            valueFormatter && Number.isFinite(num)
              ? valueFormatter(num, name)
              : Number.isFinite(num)
                ? formatCompact(num)
                : String(raw ?? "");

          return (
            <div key={`${name}-${index}`} className="kit-chart-tooltip__row">
              <span
                className="kit-chart-tooltip__dot"
                style={{ background: entry.color ?? "var(--chart-1, var(--accent))" }}
              />
              <span className="kit-chart-tooltip__name">{name}</span>
              <span className="kit-chart-tooltip__value">{formatted}</span>
            </div>
          );
        })}
        {showTotal ? (
          <div className="kit-chart-tooltip__row">
            <span className="kit-chart-tooltip__dot" style={{ background: "transparent" }} />
            <span className="kit-chart-tooltip__name">{totalLabel}</span>
            <span className="kit-chart-tooltip__value">{formatCompact(total)}</span>
          </div>
        ) : null}
      </div>
      {footer ? <div className="kit-chart-tooltip__foot">{footer}</div> : null}
    </div>
  );
}

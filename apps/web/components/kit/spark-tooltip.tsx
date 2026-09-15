"use client";

type SparkTooltipProps = {
  label: string;
  value: number;
  x: number;
  y: number;
  visible: boolean;
  suffix?: string;
};

export function SparkTooltip({ label, value, x, y, visible, suffix = "%" }: SparkTooltipProps) {
  if (!visible) {
    return null;
  }

  return (
    <div
      className="kit-chart-tooltip kit-chart-tooltip--spark"
      style={{ left: x, top: y, position: "fixed", pointerEvents: "none", zIndex: 70 }}
    >
      <div className="kit-chart-tooltip__label">{label}</div>
      <div className="kit-chart-tooltip__rows">
        <div className="kit-chart-tooltip__row">
          <span
            className="kit-chart-tooltip__dot"
            style={{ background: "var(--chart-1, var(--accent))" }}
          />
          <span className="kit-chart-tooltip__name">Value</span>
          <span className="kit-chart-tooltip__value">
            {value}
            {suffix}
          </span>
        </div>
      </div>
    </div>
  );
}

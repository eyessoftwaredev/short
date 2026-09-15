/**
 * Recharts stroke/fill mapped to kit chart tokens.
 *
 * Every value carries a fallback: Recharts writes these straight into SVG
 * paint attributes, and an undefined custom property there resolves to black,
 * which is invisible on a dark canvas. The fallback keeps a chart legible even
 * if it is mounted outside a themed root.
 */
export const chartColors = {
  c1: "var(--chart-1, var(--accent))",
  c2: "var(--chart-2, var(--warn))",
  c3: "var(--chart-3, var(--accent-bright))",
  c4: "var(--chart-4, var(--fg-muted))",
  c5: "var(--chart-5, var(--danger))",
  grid: "var(--chart-grid, var(--border-subtle))",
  track: "var(--chart-track, var(--surface))",
  cursor: "var(--chart-cursor, var(--border-strong))",
  accent: "var(--accent)",
  accentSurface: "var(--accent-surface)",
} as const;

/**
 * Series in plotting order. Consecutive entries differ in hue *and* lightness,
 * so a two-series chart stays readable for the common colour-vision
 * deficiencies and in greyscale print.
 */
export const chartSeries = [
  chartColors.c1,
  chartColors.c2,
  chartColors.c3,
  chartColors.c4,
  chartColors.c5,
] as const;

export function seriesColor(index: number): string {
  return chartSeries[index % chartSeries.length];
}

export const chartAxisStyle = {
  fontSize: 11,
  fill: "var(--fg-subtle)",
  fontFamily: "var(--font-mono)",
} as const;

/**
 * Horizontal rules only, and thin enough to sit behind the data rather than
 * compete with it. Vertical rules are handled by the tooltip cursor instead.
 */
export const chartGridProps = {
  stroke: chartColors.grid,
  strokeDasharray: "3 3",
  vertical: false,
} as const;

/** Dashed vertical guide that follows the pointer on time-series charts. */
export const chartTooltipCursor = {
  stroke: chartColors.cursor,
  strokeDasharray: "4 4",
  strokeWidth: 1,
} as const;

/**
 * Left is pulled in because the Y axis reserves its own width; the small top
 * gap stops the highest point's stroke from being clipped.
 */
export const chartMargin = { top: 8, right: 8, bottom: 0, left: -16 } as const;

/**
 * A series with one bucket draws no line, so the point has to be rendered as a
 * dot or the chart looks empty. Spread onto the `dot` prop of an Area/Line.
 */
export function singlePointDot(pointCount: number, color: string) {
  if (pointCount > 1) {
    return false as const;
  }
  return { r: 3, fill: color, stroke: color, strokeWidth: 0 };
}

/**
 * Recharts auto-scales an all-zero series to a meaningless axis. Pinning the
 * domain to 0–1 keeps the baseline where the reader expects it.
 */
export function valueDomain(maxValue: number): [number, number | "auto"] {
  return maxValue <= 0 ? [0, 1] : [0, "auto"];
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return String(Math.round(value));
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return `${value.toFixed(fractionDigits)}%`;
}

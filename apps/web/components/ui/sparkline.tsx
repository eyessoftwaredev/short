import { useId } from "react";
import { cn } from "@/lib/cx";

type SparklineTone = "accent" | "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5" | "muted";

type SparklineProps = {
  /** Values in time order. Fewer than two points renders a flat baseline. */
  data: readonly number[];
  tone?: SparklineTone;
  /** Pixel height of the drawing; width always fills the container. */
  height?: number;
  /** Soft gradient under the line. On by default. */
  area?: boolean;
  className?: string;
};

const toneVar: Record<SparklineTone, string> = {
  accent: "var(--accent)",
  "chart-1": "var(--chart-1)",
  "chart-2": "var(--chart-2)",
  "chart-3": "var(--chart-3)",
  "chart-4": "var(--chart-4)",
  "chart-5": "var(--chart-5)",
  muted: "var(--chart-muted)",
};

const VIEW_W = 100;

/**
 * Dependency-free trend line for stat tiles. Decorative by design — the figure
 * next to it carries the number, so it is hidden from assistive tech.
 * For an interactive chart use `TimeseriesChart`.
 */
export function Sparkline({
  data,
  tone = "chart-1",
  height = 36,
  area = true,
  className,
}: SparklineProps) {
  const gradientId = useId().replace(/:/g, "");
  const color = toneVar[tone];
  const points = data.length > 1 ? data : [0, 0];
  const max = Math.max(...points);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  // 2px inset top and bottom so the 2px stroke is never clipped.
  const pad = 2;
  const coords = points.map((value, index) => {
    const x = (index / (points.length - 1)) * VIEW_W;
    const y = pad + (1 - (value - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = coords.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const fill = `${line} L${VIEW_W},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      className={cn("block overflow-visible", className)}
      aria-hidden="true"
      focusable="false"
    >
      {area ? (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={fill} fill={`url(#${gradientId})`} stroke="none" />
        </>
      ) : null}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

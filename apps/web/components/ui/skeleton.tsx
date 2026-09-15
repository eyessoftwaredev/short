import { cn } from "@/lib/cx";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return <span className={cn("skeleton-sheen block rounded-sm", className)} />;
}

type SkeletonTextProps = {
  lines?: number;
  className?: string;
};

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <span className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          // The last line is short so the block reads as a paragraph rather than a box.
          className={cn("h-3.5", index === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </span>
  );
}

type SkeletonTableProps = {
  rows?: number;
  columns?: number;
  /** Mirrors the header band of a real `<Table>`. */
  header?: boolean;
  className?: string;
};

/**
 * Deliberately built from the same chrome as `Table` — outer border, tinted
 * header band, divided rows — so the page does not visibly re-flow when the
 * real rows arrive.
 */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  header = true,
  className,
}: SkeletonTableProps) {
  return (
    <div
      className={cn("min-w-0 overflow-hidden rounded-default border border-border bg-bg", className)}
      aria-hidden="true"
    >
      {header ? (
        <div className="flex items-center gap-4 border-b border-border bg-surface-subtle px-3.5 py-3">
          {Array.from({ length: columns }, (_, index) => (
            <Skeleton key={index} className={cn("h-2.5", index === 0 ? "flex-2" : "flex-1")} />
          ))}
        </div>
      ) : null}
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 border-b border-border-subtle px-3.5 py-3 last:border-b-0"
        >
          {Array.from({ length: columns }, (_, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={cn("h-3.5", columnIndex === 0 ? "flex-2" : "flex-1")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

type SkeletonCardProps = {
  /** Reserves room for the `delta` line, matching a metric `Card`. */
  delta?: boolean;
  className?: string;
};

/** The resting shape of a metric `Card`: label, figure, delta. */
export function SkeletonCard({ delta = true, className }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2.5 rounded-default border border-border bg-bg p-5",
        className,
      )}
      aria-hidden="true"
    >
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32" />
      {delta ? <Skeleton className="h-3.5 w-40" /> : null}
    </div>
  );
}

type SkeletonChartProps = {
  /** Matches the `height` passed to the chart it stands in for. */
  height?: "sm" | "md" | "lg";
  className?: string;
};

const chartHeights: Record<NonNullable<SkeletonChartProps["height"]>, string> = {
  sm: "h-40",
  md: "h-64",
  lg: "h-76",
};

/**
 * A plot area with an axis gutter rather than a plain grey slab, so the swap to
 * a real chart does not shift the surrounding layout.
 */
export function SkeletonChart({ height = "md", className }: SkeletonChartProps) {
  return (
    <div
      className={cn("flex min-w-0 flex-col gap-3", chartHeights[height], className)}
      aria-hidden="true"
    >
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="flex w-10 shrink-0 flex-col justify-between py-1">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-2 w-full" />
          ))}
        </div>
        <Skeleton className="min-w-0 flex-1 rounded-default" />
      </div>
      <div className="flex gap-3 pl-13">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-2 flex-1" />
        ))}
      </div>
    </div>
  );
}

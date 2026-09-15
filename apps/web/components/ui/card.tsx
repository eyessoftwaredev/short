import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cx";
import { Skeleton } from "./skeleton";

/** Direction of travel for the `delta` line. `neutral` keeps it muted. */
type CardTrend = "up" | "down" | "neutral";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  label?: ReactNode;
  value?: ReactNode;
  delta?: ReactNode;
  staticHover?: boolean;
  /**
   * Colours the delta. Left as `neutral` the line stays muted, which is the
   * right default — for half the metrics in this product "down" is good news.
   */
  trend?: CardTrend;
  /** Small glyph beside the label, e.g. the metric's nav icon. */
  icon?: ReactNode;
  /** Turns the whole card into a link to the drill-down for this metric. */
  href?: string;
  /** Renders a skeleton in the card's own shape instead of the content. */
  loading?: boolean;
  children?: ReactNode;
};

const trendClasses: Record<CardTrend, string> = {
  up: "text-accent-on-surface",
  down: "text-danger",
  neutral: "text-fg-muted",
};

export function Card({
  label,
  value,
  delta,
  staticHover = false,
  trend = "neutral",
  icon,
  href,
  loading = false,
  className,
  children,
  ...props
}: CardProps) {
  const interactive = href != null && !loading;

  const body = loading ? (
    <>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3.5 w-40" />
    </>
  ) : (
    <>
      {label != null || icon != null ? (
        <span className="flex min-w-0 items-center gap-2">
          {icon ? (
            <span className="shrink-0 text-fg-subtle" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          {label != null ? (
            <span className="min-w-0 truncate font-mono text-xs tracking-widest text-fg-subtle uppercase">
              {label}
            </span>
          ) : null}
        </span>
      ) : null}
      {/* Compared against null rather than truthiness so a metric of 0 still
          renders — a zero is a real reading, not a missing one. */}
      {value != null && value !== "" ? (
        <span className="numeric truncate text-3xl leading-tight font-semibold tracking-tight">
          {value}
        </span>
      ) : null}
      {delta ? <span className={cn("text-sm", trendClasses[trend])}>{delta}</span> : null}
      {children}
    </>
  );

  const classes = cn(
    "flex min-w-0 flex-col gap-2.5 rounded-default border border-border bg-bg p-5 text-ink no-underline transition duration-200",
    !staticHover &&
      !loading &&
      "hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lift",
    interactive && "hover:no-underline",
    className,
  );

  if (interactive) {
    return (
      <Link href={href} className={classes}>
        {body}
      </Link>
    );
  }

  return (
    <div className={classes} aria-busy={loading || undefined} {...props}>
      {body}
    </div>
  );
}

import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cx";
import { Skeleton } from "./skeleton";

/** Direction of travel for the `delta` line. `neutral` keeps it muted. */
type CardTrend = "up" | "down" | "neutral";

type CardPadding = "none" | "sm" | "md" | "lg";

type CardProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  /* ── Container slots ─────────────────────────────────────────────────── */
  /** Card heading. With `description`/`actions` it forms a header row. */
  title?: ReactNode;
  description?: ReactNode;
  /** Right-aligned header controls, e.g. a "View all" link or a menu. */
  actions?: ReactNode;
  /** Bottom band on a tinted strip, e.g. a secondary link or a timestamp. */
  footer?: ReactNode;
  /** Heading level for `title`. Pages own the `h1`, so cards default to `h2`. */
  headingLevel?: 2 | 3 | 4;
  /** Inner padding. `md` (20px) by default; `none` for edge-to-edge tables. */
  padding?: CardPadding;

  /* ── Legacy metric slots (prefer `StatCard` for new code) ────────────── */
  label?: ReactNode;
  value?: ReactNode;
  delta?: ReactNode;
  /** @deprecated Hover elevation now only appears on linked cards. Kept for compatibility. */
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
  up: "text-success-ink",
  down: "text-danger",
  neutral: "text-fg-muted",
};

const paddingClasses: Record<CardPadding, string> = {
  none: "p-0",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

/** Footer bleeds to the card edge, so it undoes exactly the padding in use. */
const footerBleed: Record<CardPadding, string> = {
  none: "px-5",
  sm: "-mx-4 -mb-4 px-4",
  md: "-mx-5 -mb-5 px-5",
  lg: "-mx-6 -mb-6 px-6",
};

const headingClasses = "m-0 text-[15px] leading-6 font-semibold tracking-[-0.01em] text-ink";

/**
 * The base surface of the panel: white (light) / slate (dark) on the page
 * canvas, 12px radius, hairline border, whisper shadow.
 *
 *   <Card title="Top links" description="By clicks" actions={<Button …/>}>…</Card>
 */
export function Card({
  title,
  description,
  actions,
  footer,
  headingLevel = 2,
  padding = "md",
  label,
  value,
  delta,
  staticHover: _staticHover,
  trend = "neutral",
  icon,
  href,
  loading = false,
  className,
  children,
  ...props
}: CardProps) {
  const interactive = href != null && !loading;
  const Heading = `h${headingLevel}` as const;
  const hasHeader = title != null || description != null || actions != null;

  const header = hasHeader ? (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2",
        // Edge-to-edge cards (a table inside) still pad their header.
        padding === "none" && "px-5 pt-4",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {title != null ? <Heading className={headingClasses}>{title}</Heading> : null}
        {description != null ? (
          <p className="m-0 text-sm leading-5 text-fg-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  ) : null;

  const body = loading ? (
    <>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3.5 w-40" />
    </>
  ) : (
    <>
      {header}
      {label != null || icon != null ? (
        <span className="flex min-w-0 items-center gap-2 text-fg-muted">
          {icon ? (
            <span className="flex shrink-0 text-fg-subtle" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          {label != null ? (
            <span className="min-w-0 truncate text-[13px] font-medium">{label}</span>
          ) : null}
        </span>
      ) : null}
      {/* Compared against null rather than truthiness so a metric of 0 still
          renders — a zero is a real reading, not a missing one. */}
      {value != null && value !== "" ? (
        <span className="numeric truncate text-[28px] leading-9 font-semibold tracking-[-0.02em]">
          {value}
        </span>
      ) : null}
      {delta ? <span className={cn("text-sm", trendClasses[trend])}>{delta}</span> : null}
      {children}
      {footer ? (
        <div
          className={cn(
            "mt-auto flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-b-lg border-t border-border-subtle bg-surface-subtle py-3 text-sm text-fg-muted",
            footerBleed[padding],
          )}
        >
          {footer}
        </div>
      ) : null}
    </>
  );

  const classes = cn(
    "flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-bg text-ink no-underline shadow-card transition-[border-color,box-shadow] duration-150",
    paddingClasses[padding],
    // Clips an edge-to-edge child (bare Table) to the rounded corners.
    padding === "none" && "overflow-hidden",
    interactive && "hover:border-border-strong hover:no-underline hover:shadow-lift",
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

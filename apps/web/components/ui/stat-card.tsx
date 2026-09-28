import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/kit/icon";
import { cn } from "@/lib/cx";
import { InfoTip } from "./info-tip";
import { Skeleton } from "./skeleton";

type StatTrend = "up" | "down" | "neutral";

type StatCardProps = {
  /** What is being measured, in plain words: "Clicks", "Unique visitors". */
  label: ReactNode;
  /** The headline figure, already formatted. `0` renders — it is a real reading. */
  value: ReactNode;
  /** Change vs the comparison period, e.g. "+12%". Shown as a coloured pill. */
  delta?: ReactNode;
  /**
   * Colours the delta pill. Leave `neutral` when a movement has no inherent
   * direction (e.g. "countries reached").
   */
  trend?: StatTrend;
  /** Quiet text after the delta, e.g. "vs previous 7 days". */
  deltaLabel?: ReactNode;
  /** Explains how the number is counted — shown in an ⓘ tooltip next to the label. */
  info?: ReactNode;
  /** Icon name from the kit set, or any node. */
  icon?: IconName | ReactNode;
  /** Makes the whole tile a link to its drill-down. */
  href?: string;
  /** A `<Sparkline>` (or any small chart) under the figure. */
  sparkline?: ReactNode;
  /** Extra content under the value, e.g. a `QuotaMeter`. */
  children?: ReactNode;
  loading?: boolean;
  className?: string;
};

const deltaTone: Record<StatTrend, string> = {
  up: "bg-success-surface text-success-ink",
  down: "bg-danger-surface text-danger-ink",
  neutral: "bg-surface text-fg-muted",
};

const deltaIcon: Record<StatTrend, IconName | null> = {
  up: "arrow-up",
  down: "arrow-down",
  neutral: null,
};

/**
 * Headline metric tile for dashboards and stats pages.
 *
 *   <StatCard label="Clicks" value="12,480" delta="+8.2%" trend="up"
 *             deltaLabel="vs previous 30 days" info="Human clicks, bots excluded."
 *             href="/analytics" sparkline={<Sparkline data={series} />} />
 */
export function StatCard({
  label,
  value,
  delta,
  trend = "neutral",
  deltaLabel,
  info,
  icon,
  href,
  sparkline,
  children,
  loading = false,
  className,
}: StatCardProps) {
  const glyph =
    typeof icon === "string" ? <Icon name={icon as IconName} className="text-[13px]" /> : icon;
  const arrow = deltaIcon[trend];

  if (loading) {
    return (
      <div
        className={cn(
          "flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-bg p-5 shadow-card",
          className,
        )}
        aria-busy="true"
      >
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-3.5 w-36" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-bg p-5 shadow-card transition-[border-color,box-shadow] duration-150",
        href && "hover:border-border-strong hover:shadow-lift",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {glyph ? (
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-default bg-surface text-fg-muted"
            aria-hidden="true"
          >
            {glyph}
          </span>
        ) : null}
        <span className="min-w-0 truncate text-[13px] font-medium text-fg-muted">{label}</span>
        {info ? (
          // Above the stretched link so the tooltip stays reachable.
          <InfoTip label={typeof label === "string" ? label : "Info"} className="relative z-10">
            {info}
          </InfoTip>
        ) : null}
        {href ? (
          <Icon
            name="arrow-right"
            className="ml-auto text-xs text-fg-subtle opacity-0 transition-opacity duration-150 group-hover:opacity-100"
          />
        ) : null}
      </div>

      <div className="numeric min-w-0 truncate text-[28px] leading-9 font-semibold tracking-[-0.02em] text-ink">
        {value}
      </div>

      {delta != null || deltaLabel != null ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
          {delta != null ? (
            <span
              className={cn(
                "numeric inline-flex h-5.5 items-center gap-1 rounded-sm px-1.5 text-xs font-semibold",
                deltaTone[trend],
              )}
            >
              {arrow ? <Icon name={arrow} className="text-[10px]" /> : null}
              {delta}
            </span>
          ) : null}
          {deltaLabel != null ? <span className="min-w-0 text-fg-subtle">{deltaLabel}</span> : null}
        </div>
      ) : null}

      {sparkline ? <div className="-mx-1 mt-auto min-w-0">{sparkline}</div> : null}
      {children}

      {href ? (
        <Link
          href={href}
          className="absolute inset-0 rounded-lg no-underline"
          aria-label={typeof label === "string" ? label : undefined}
        >
          <span className="sr-only">{typeof label === "string" ? label : null}</span>
        </Link>
      ) : null}
    </div>
  );
}

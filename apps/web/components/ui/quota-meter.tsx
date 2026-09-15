import { formatLimit, isWithinLimit } from "@short/core";
import { Progress } from "./progress";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cx";

type QuotaMeterProps = {
  label: string;
  used: number;
  /** `-1` means unlimited: the bar is hidden and the remainder note is skipped. */
  limit: number;
  className?: string;
};

export function QuotaMeter({ label, used, limit, className }: QuotaMeterProps) {
  const unlimited = limit === -1;
  const ratio = unlimited || limit === 0 ? 0 : used / limit;
  const exceeded = !isWithinLimit(limit, used);
  const tone = exceeded ? "danger" : ratio >= 0.85 ? "warn" : "accent";
  const remaining = Math.max(0, limit - used);

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm text-fg-muted">{label}</span>
        <span className="shrink-0 font-mono text-sm">
          {formatNumber(used)} / {formatLimit(limit)}
        </span>
      </div>

      {unlimited ? null : (
        <>
          <Progress value={used} max={Math.max(limit, 1)} tone={tone} />
          <span
            className={cn(
              "text-xs",
              tone === "danger"
                ? "text-danger"
                : tone === "warn"
                  ? "text-warn-ink"
                  : "text-fg-subtle",
            )}
          >
            {exceeded ? "Limit reached — upgrade for more." : `${formatNumber(remaining)} left.`}
          </span>
        </>
      )}
    </div>
  );
}

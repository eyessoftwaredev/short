import { formatLimit, isWithinLimit } from "@short/core";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Progress } from "./progress";
import { InfoTip } from "./info-tip";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cx";

type QuotaMeterProps = {
  label: string;
  used: number;
  /** `-1` means unlimited: the bar is hidden and the remainder note is skipped. */
  limit: number;
  /** Explains what counts toward the limit. */
  info?: string;
  /** Shows an "Upgrade" link once usage passes 85% (or the limit is hit). */
  upgradeHref?: string;
  /** Tighter type for the sidebar plan card. */
  compact?: boolean;
  className?: string;
};

export function QuotaMeter({
  label,
  used,
  limit,
  info,
  upgradeHref,
  compact = false,
  className,
}: QuotaMeterProps) {
  const t = useTranslations("common");
  const unlimited = limit === -1;
  const ratio = unlimited || limit === 0 ? 0 : used / limit;
  const exceeded = !isWithinLimit(limit, used);
  const tone = exceeded ? "danger" : ratio >= 0.85 ? "warn" : "accent";
  const remaining = Math.max(0, limit - used);

  return (
    <div className={cn("flex min-w-0 flex-col", compact ? "gap-1.5" : "gap-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "flex min-w-0 items-center gap-1.5 text-fg-muted",
            compact ? "text-xs" : "text-sm",
          )}
        >
          <span className="truncate">{label}</span>
          {info ? <InfoTip label={label}>{info}</InfoTip> : null}
        </span>
        <span className={cn("numeric shrink-0 font-medium text-ink", compact ? "text-xs" : "text-sm")}>
          {formatNumber(used)}
          <span className="font-normal text-fg-subtle"> / {unlimited ? t("unlimited") : formatLimit(limit)}</span>
        </span>
      </div>

      {unlimited ? null : (
        <>
          <Progress value={used} max={Math.max(limit, 1)} tone={tone} size={compact ? "sm" : "md"} />
          {compact ? null : (
            <span
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 text-xs",
                tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn-ink" : "text-fg-subtle",
              )}
            >
              <span>
                {exceeded ? t("quotaReached") : t("quotaLeft", { count: formatNumber(remaining) })}
              </span>
              {upgradeHref && tone !== "accent" ? (
                <Link href={upgradeHref} className="font-medium text-accent-ink">
                  {t("upgrade")}
                </Link>
              ) : null}
            </span>
          )}
        </>
      )}
    </div>
  );
}

import { cn } from "@/lib/cx";

type ProgressProps = {
  value: number;
  max?: number;
  /** `warn` / `danger` mark a quota that is nearly or fully consumed. */
  tone?: "accent" | "warn" | "danger";
  /**
   * Names the bar for assistive tech. Without it the bar is decorative, which
   * is the right call when an adjacent line already states the numbers.
   */
  label?: string;
  /** Skips the fill animation, e.g. for the many small bars in a breakdown. */
  animate?: boolean;
  className?: string;
};

const toneClasses: Record<NonNullable<ProgressProps["tone"]>, string> = {
  accent: "bg-accent",
  warn: "bg-warn",
  danger: "bg-danger",
};

export function Progress({
  value,
  max = 100,
  tone = "accent",
  label,
  animate = true,
  className,
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      role={label ? "progressbar" : undefined}
      aria-label={label}
      aria-valuenow={label ? Math.round(value) : undefined}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? max : undefined}
      className={cn("h-2 overflow-hidden rounded-pill bg-surface", className)}
    >
      <span
        className={cn(
          "block h-full rounded-pill",
          animate && "animate-progress-fill",
          toneClasses[tone],
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

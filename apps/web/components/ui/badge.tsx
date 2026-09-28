import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cx";

/**
 * `success` is for healthy states (active, verified, paid). `accent` is brand
 * emphasis (new, recommended). `muted` and `neutral` are the same grey.
 */
type BadgeTone = "accent" | "success" | "info" | "warn" | "danger" | "muted" | "neutral" | "inverse";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: BadgeTone;
  /**
   * Prefixes a tone-coloured dot. Lets a status read at a glance and survive
   * a grayscale or colour-blind view, where the fill alone would not.
   */
  dot?: boolean;
  /** `sm` for dense table cells, `md` (default) everywhere else. */
  size?: "sm" | "md";
};

const toneClasses: Record<BadgeTone, string> = {
  accent: "border-accent-border bg-accent-surface text-accent-on-surface",
  success: "border-success-border bg-success-surface text-success-ink",
  info: "border-info-border bg-info-surface text-info-ink",
  warn: "border-warn-border bg-warn-surface text-warn-ink",
  danger: "border-danger-border bg-danger-surface text-danger-ink",
  muted: "border-border bg-surface text-fg-muted",
  neutral: "border-border bg-surface text-fg-muted",
  inverse: "border-transparent bg-inverse text-on-inverse",
};

const dotClasses: Record<BadgeTone, string> = {
  accent: "bg-accent",
  success: "bg-success",
  info: "bg-info",
  warn: "bg-warn",
  danger: "bg-danger",
  muted: "bg-fg-subtle",
  neutral: "bg-fg-subtle",
  inverse: "bg-on-inverse",
};

export function Badge({
  children,
  tone = "accent",
  dot = false,
  size = "md",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-sm border font-medium whitespace-nowrap",
        size === "sm" ? "h-5 px-1.5 text-[11px] leading-none" : "h-5.5 px-2 text-xs leading-none",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {dot ? (
        <span
          className={cn("size-1.5 shrink-0 rounded-pill", dotClasses[tone])}
          aria-hidden="true"
        />
      ) : null}
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

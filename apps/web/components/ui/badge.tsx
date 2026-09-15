import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cx";

type BadgeTone = "accent" | "danger" | "muted" | "warn" | "inverse";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: BadgeTone;
  /**
   * Prefixes a tone-coloured dot. Lets a status read at a glance and survive
   * a grayscale or colour-blind view, where the fill alone would not.
   */
  dot?: boolean;
};

const toneClasses: Record<BadgeTone, string> = {
  // `accent-on-surface` rather than `accent-hover`: the hover colour is tuned
  // for solid fills and drops below 4.5:1 on the tinted surface in dark mode.
  accent: "bg-accent-surface text-accent-on-surface",
  danger: "bg-danger-surface text-danger",
  muted: "bg-surface text-fg-muted",
  warn: "bg-warn-surface text-warn-ink",
  inverse: "bg-inverse text-on-inverse",
};

const dotClasses: Record<BadgeTone, string> = {
  accent: "bg-accent",
  danger: "bg-danger",
  muted: "bg-fg-subtle",
  warn: "bg-warn",
  inverse: "bg-on-inverse",
};

export function Badge({ children, tone = "accent", dot = false, className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-xs px-2 py-1 text-xs leading-tight font-medium",
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

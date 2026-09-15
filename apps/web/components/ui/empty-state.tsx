import type { ReactNode } from "react";
import { cn } from "@/lib/cx";

type EmptyStateSize = "sm" | "md";

type EmptyStateProps = {
  /** Short mono eyebrow, e.g. a status code or a section name. */
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  /**
   * Quiet supporting line under the actions — a keyboard hint, a docs link, a
   * "you can import instead" escape hatch.
   */
  hint?: ReactNode;
  /** `sm` fits inside a dashboard card; `md` owns a whole page region. */
  size?: EmptyStateSize;
  /**
   * `first-run` tints the icon with the accent and solidifies the border: the
   * state is an invitation, not a failure. `default` stays neutral for "no
   * results for this filter", which genuinely is a dead end.
   */
  tone?: "default" | "first-run";
  className?: string;
};

export function EmptyState({
  eyebrow,
  title,
  description,
  icon,
  actions,
  hint,
  size = "md",
  tone = "default",
  className,
}: EmptyStateProps) {
  const compact = size === "sm";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center gap-3 rounded-default border text-center",
        tone === "first-run" ? "border-border bg-surface-subtle" : "border-dashed border-border",
        compact ? "px-5 py-8" : "px-6 py-14",
        className,
      )}
    >
      {icon ? (
        <span
          className={cn(
            "flex items-center justify-center rounded-default",
            compact ? "size-9" : "size-11",
            tone === "first-run"
              ? "bg-accent-surface text-accent-on-surface"
              : "bg-surface text-fg-muted",
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}
      {eyebrow ? (
        <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">{eyebrow}</span>
      ) : null}
      <h3 className={cn("m-0 font-semibold", compact ? "text-base" : "text-xl")}>{title}</h3>
      {description ? (
        <p className="m-0 max-w-prose text-sm leading-relaxed text-fg-muted">{description}</p>
      ) : null}
      {actions ? <div className="mt-2 flex flex-wrap justify-center gap-2.5">{actions}</div> : null}
      {hint ? (
        <p className="m-0 max-w-prose text-xs leading-relaxed text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

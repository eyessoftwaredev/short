import type { ReactNode } from "react";
import { Icon, ICONS, type IconName } from "@/components/kit/icon";
import { cn } from "@/lib/cx";

type EmptyStateSize = "sm" | "md";

type EmptyStateProps = {
  /** Short eyebrow above the title, e.g. a status code or a section name. */
  eyebrow?: ReactNode;
  /** What is missing, in plain words: "No links yet". */
  title: ReactNode;
  /** Why it is empty and what the user gets by acting: one or two sentences. */
  description?: ReactNode;
  /** Kit icon name (`"link"`) or any node. */
  icon?: IconName | ReactNode;
  /** The way forward — usually one primary Button, optionally a secondary. */
  actions?: ReactNode;
  /**
   * Quiet supporting line under the actions — a keyboard hint, a docs link, a
   * "you can import instead" escape hatch.
   */
  hint?: ReactNode;
  /** `sm` fits inside a dashboard card; `md` owns a whole page region. */
  size?: EmptyStateSize;
  /**
   * `first-run` tints the icon with the accent: the state is an invitation,
   * not a failure. `default` stays neutral for "no results for this filter".
   */
  tone?: "default" | "first-run";
  /** Drop the border and background, e.g. when already inside a Card. */
  bare?: boolean;
  className?: string;
};

function isIconName(value: unknown): value is IconName {
  return typeof value === "string" && value in ICONS;
}

/**
 * Never a dead end: every empty state says what is missing, why it matters and
 * offers the next step.
 *
 *   <EmptyState tone="first-run" icon="link" title="No links yet"
 *     description="Shorten a URL and share it — clicks show up here within seconds."
 *     actions={<Button variant="primary" leadingIcon="plus" href="/links/new">Create link</Button>} />
 */
export function EmptyState({
  eyebrow,
  title,
  description,
  icon,
  actions,
  hint,
  size = "md",
  tone = "default",
  bare = false,
  className,
}: EmptyStateProps) {
  const compact = size === "sm";
  const glyph = isIconName(icon) ? (
    <Icon name={icon} className={compact ? "text-sm" : "text-base"} />
  ) : (
    icon
  );

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center text-center",
        !bare &&
          (tone === "first-run"
            ? "rounded-lg border border-border bg-bg shadow-card"
            : "rounded-lg border border-dashed border-border-strong bg-bg/60"),
        compact ? "gap-2 px-5 py-8" : "gap-3 px-6 py-14",
        className,
      )}
    >
      {glyph ? (
        <span
          className={cn(
            "mb-1 flex items-center justify-center rounded-md ring-1 ring-inset",
            compact ? "size-10" : "size-12",
            tone === "first-run"
              ? "bg-accent-surface text-accent ring-accent-border"
              : "bg-surface text-fg-muted ring-border",
          )}
          aria-hidden="true"
        >
          {glyph}
        </span>
      ) : null}
      {eyebrow ? <span className="text-xs font-medium text-fg-subtle">{eyebrow}</span> : null}
      <h3
        className={cn(
          "m-0 font-semibold tracking-[-0.01em] text-ink",
          compact ? "text-[15px] leading-6" : "text-lg leading-7",
        )}
      >
        {title}
      </h3>
      {description ? (
        <p className="m-0 max-w-md text-sm leading-6 text-fg-muted">{description}</p>
      ) : null}
      {actions ? (
        <div className={cn("flex flex-wrap justify-center gap-2", compact ? "mt-2" : "mt-3")}>
          {actions}
        </div>
      ) : null}
      {hint ? <p className="m-0 mt-1 max-w-md text-[13px] leading-5 text-fg-subtle">{hint}</p> : null}
    </div>
  );
}

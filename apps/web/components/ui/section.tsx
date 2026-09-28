import type { ReactNode } from "react";
import { cn } from "@/lib/cx";

type SectionProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /**
   * Heading level for the section title. Pages put an `h1` in the `PageHeader`,
   * so `2` is right for a top-level section and `3` for one nested inside it —
   * screen-reader users navigate by this outline.
   */
  headingLevel?: 2 | 3 | 4;
  /** Anchor target, also wired to `aria-labelledby` on the section. */
  id?: string;
  /** Right-hand counter or timestamp, kept out of the `actions` cluster. */
  meta?: ReactNode;
  className?: string;
  contentClassName?: string;
};

const headingClasses: Record<NonNullable<SectionProps["headingLevel"]>, string> = {
  2: "text-base leading-6 font-semibold tracking-[-0.01em]",
  3: "text-[15px] leading-6 font-semibold tracking-[-0.01em]",
  4: "text-sm leading-5 font-semibold",
};

/**
 * An unboxed group on the page canvas: heading + description + actions, then
 * content (usually a Card, Table or Grid). For a boxed group with a header
 * inside the border, use `Card title=…` or `SectionCard`.
 */
export function Section({
  title,
  description,
  actions,
  children,
  headingLevel = 2,
  id,
  meta,
  className,
  contentClassName,
}: SectionProps) {
  const Heading = `h${headingLevel}` as const;
  const headingId = id ? `${id}-title` : undefined;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("flex min-w-0 flex-col gap-3", className)}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <Heading id={headingId} className={cn("m-0 text-ink", headingClasses[headingLevel])}>
              {title}
            </Heading>
            {meta ? <span className="shrink-0 text-xs text-fg-subtle">{meta}</span> : null}
          </div>
          {description ? <p className="m-0 mt-0.5 text-sm leading-5 text-fg-muted">{description}</p> : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      <div className={cn("min-w-0", contentClassName)}>{children}</div>
    </section>
  );
}

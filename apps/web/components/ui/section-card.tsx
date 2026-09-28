import type { ReactNode } from "react";
import { cn } from "@/lib/cx";
import { InfoTip } from "./info-tip";

type SectionCardProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Right side of the header, e.g. a secondary button. */
  actions?: ReactNode;
  /** Tinted bottom band — the usual home of a form's Save button. */
  footer?: ReactNode;
  children: ReactNode;
  /** Anchor target, also wired to `aria-labelledby`. */
  id?: string;
  headingLevel?: 2 | 3;
  /** `danger` outlines the card in red — use for "Delete workspace" and similar. */
  tone?: "default" | "danger";
  /**
   * Draws a rule between direct children. On by default, which is what a stack
   * of `SettingsRow`s wants; turn off for free-form content.
   */
  divided?: boolean;
  className?: string;
  contentClassName?: string;
};

/**
 * A titled card for settings and form pages. Stack `SettingsRow`s inside it:
 *
 *   <SectionCard title="Workspace" description="Name and address."
 *                footer={<Button variant="primary" type="submit">Save</Button>}>
 *     <SettingsRow label="Name" description="Shown to your team." info="…">
 *       <Input name="name" />
 *     </SettingsRow>
 *   </SectionCard>
 */
export function SectionCard({
  title,
  description,
  actions,
  footer,
  children,
  id,
  headingLevel = 2,
  tone = "default",
  divided = true,
  className,
  contentClassName,
}: SectionCardProps) {
  const Heading = `h${headingLevel}` as const;
  const headingId = id ? `${id}-title` : undefined;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "flex min-w-0 flex-col rounded-lg border bg-bg shadow-card",
        tone === "danger" ? "border-danger-border" : "border-border",
        className,
      )}
    >
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border-subtle px-5 py-4 sm:px-6">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Heading
            id={headingId}
            className={cn(
              "m-0 text-[15px] leading-6 font-semibold tracking-[-0.01em]",
              tone === "danger" ? "text-danger" : "text-ink",
            )}
          >
            {title}
          </Heading>
          {description ? <p className="m-0 text-sm leading-5 text-fg-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col px-5 sm:px-6",
          divided ? "divide-y divide-border-subtle" : "gap-5 py-5",
          contentClassName,
        )}
      >
        {children}
      </div>
      {footer ? (
        <footer className="flex min-w-0 flex-wrap items-center justify-end gap-2 rounded-b-lg border-t border-border-subtle bg-surface-subtle px-5 py-3 sm:px-6">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

type SettingsRowProps = {
  /** The setting's name, in plain words. */
  label: ReactNode;
  /** One line on what changes when this is set. */
  description?: ReactNode;
  /** Longer explanation behind an ⓘ next to the label. */
  info?: ReactNode;
  /** Points the label at the control's `id` (the label is not a wrapping `<label>`). */
  htmlFor?: string;
  /** The control: an input, a Switch, a Select, a Button… */
  children: ReactNode;
  /**
   * `inline` (default) puts the control on the right from `md` up — right for
   * switches and short inputs. `stacked` always puts it under the label —
   * right for textareas, long lists and rule builders.
   */
  layout?: "inline" | "stacked";
  className?: string;
};

/**
 * One setting: label + description on the left, the control on the right.
 * Collapses to a single column on small screens.
 */
export function SettingsRow({
  label,
  description,
  info,
  htmlFor,
  children,
  layout = "inline",
  className,
}: SettingsRowProps) {
  const LabelTag = htmlFor ? "label" : "div";
  const stacked = layout === "stacked";

  return (
    <div
      className={cn(
        "grid min-w-0 gap-x-8 gap-y-3 py-5",
        stacked ? "grid-cols-1" : "grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <LabelTag
            {...(htmlFor ? { htmlFor } : {})}
            className="min-w-0 text-sm leading-5 font-medium text-ink"
          >
            {label}
          </LabelTag>
          {info ? <InfoTip label={typeof label === "string" ? label : "Info"}>{info}</InfoTip> : null}
        </span>
        {description ? <p className="m-0 text-[13px] leading-5 text-fg-muted">{description}</p> : null}
      </div>
      <div className={cn("flex min-w-0 flex-col gap-2", !stacked && "md:items-stretch")}>{children}</div>
    </div>
  );
}

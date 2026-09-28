import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/kit/icon";
import { Callout } from "@/components/ui";

type AuthHeadingProps = {
  title: string;
  description: ReactNode;
  /** Optional glyph tile above the title, for confirmation screens (inbox, key…). */
  icon?: IconName;
};

export function AuthHeading({ title, description, icon }: AuthHeadingProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {icon ? (
        <span
          className="mb-2 flex size-11 items-center justify-center rounded-lg bg-accent-surface text-accent-on-surface"
          aria-hidden="true"
        >
          <Icon name={icon} className="text-lg" />
        </span>
      ) : null}
      <h1 className="m-0 text-2xl leading-tight font-semibold tracking-tight text-balance text-ink sm:text-[1.75rem]">
        {title}
      </h1>
      <p className="m-0 text-[15px] leading-relaxed text-fg-muted">{description}</p>
    </div>
  );
}

type AuthAlertTone = "danger" | "accent" | "info";

const calloutTone = {
  danger: "danger",
  accent: "success",
  info: "info",
} as const;

type AuthAlertProps = {
  tone?: AuthAlertTone;
  title?: string;
  children: ReactNode;
};

/** Inline message above an auth form. Danger announces itself (role=alert via Callout). */
export function AuthAlert({ tone = "danger", title, children }: AuthAlertProps) {
  return (
    <Callout tone={calloutTone[tone]} title={title}>
      {children}
    </Callout>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
      <span className="text-xs font-medium text-fg-subtle" aria-hidden="true">
        {label}
      </span>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  );
}

/** Read-only "sent to / requested for" box on confirmation screens. */
export function AuthValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-md border border-border bg-surface-subtle px-4 py-3">
      <span className="text-xs font-medium text-fg-subtle">{label}</span>
      <span className="min-w-0 font-mono text-sm break-all text-ink">{value}</span>
    </div>
  );
}

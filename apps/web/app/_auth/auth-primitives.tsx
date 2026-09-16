import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/kit/icon";
import { cn } from "@/lib/cx";

type AuthHeadingProps = {
  title: string;
  description: string;
};

export function AuthHeading({ title, description }: AuthHeadingProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h1 className="m-0 text-3xl leading-tight font-semibold tracking-tight">{title}</h1>
      <p className="m-0 text-base leading-relaxed text-fg-muted">{description}</p>
    </div>
  );
}

type AuthAlertTone = "danger" | "accent" | "info";

const alertTone: Record<AuthAlertTone, { box: string; icon: string }> = {
  danger: { box: "border-danger bg-danger-surface", icon: "text-danger" },
  accent: { box: "border-accent bg-accent-tint", icon: "text-accent-ink" },
  info: { box: "border-border-strong bg-surface-subtle", icon: "text-fg-muted" },
};

const alertIcon: Record<AuthAlertTone, IconName> = {
  danger: "warning",
  accent: "circle-check",
  info: "circle-info",
};

type AuthAlertProps = {
  tone?: AuthAlertTone;
  title?: string;
  children: ReactNode;
};

export function AuthAlert({ tone = "danger", title, children }: AuthAlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-default border px-3.5 py-3",
        alertTone[tone].box,
      )}
    >
      <Icon name={alertIcon[tone]} className={cn("mt-0.5 shrink-0 text-sm", alertTone[tone].icon)} />
      <div className="min-w-0 text-sm">
        {title ? <p className="m-0 font-medium text-ink">{title}</p> : null}
        <p className={cn("m-0 text-fg-muted", title && "mt-0.5")}>{children}</p>
      </div>
    </div>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
      <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">{label}</span>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  );
}

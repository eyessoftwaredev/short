"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/kit/icon";
import { Badge, Disclosure, InfoTip } from "@/components/ui";
import { cn } from "@/lib/cx";

/** Numbered tile in front of the two essential cards ("1 Where should it go?"). */
export function StepTitle({ n, children }: { n: number; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="numeric flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-surface text-xs font-semibold text-accent-on-surface"
      >
        {n}
      </span>
      {children}
    </span>
  );
}

type FormSectionProps = {
  id: string;
  icon: IconName;
  title: ReactNode;
  description: ReactNode;
  /** Short "what is set" marker shown while collapsed, e.g. "2 rules". */
  summary?: ReactNode;
  /** Marks a plan-gated section. */
  locked?: ReactNode;
  /** A field inside has an error. */
  invalid?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

/** One optional group of the link editor, collapsed until the user needs it. */
export function FormSection({
  id,
  icon,
  title,
  description,
  summary,
  locked,
  invalid = false,
  open,
  onOpenChange,
  children,
}: FormSectionProps) {
  return (
    <div id={`section-${id}`} className="scroll-mt-24">
      <Disclosure
        open={open}
        onOpenChange={onOpenChange}
        className={cn(invalid && "border-danger-border")}
        title={
          <span className="flex items-center gap-2">
            <Icon name={icon} className={cn("text-xs", invalid ? "text-danger" : "text-fg-subtle")} />
            {title}
          </span>
        }
        description={description}
        badge={
          invalid ? (
            <Badge tone="danger" size="sm">
              <Icon name="circle-exclamation" className="text-[10px]" />
            </Badge>
          ) : summary ? (
            <Badge tone="accent" size="sm" className="max-w-40">
              {summary}
            </Badge>
          ) : locked ? (
            <Badge tone="neutral" size="sm">
              <Icon name="lock" className="mr-1 text-[9px]" />
              {locked}
            </Badge>
          ) : null
        }
      >
        <div className="flex min-w-0 flex-col gap-5">{children}</div>
      </Disclosure>
    </div>
  );
}

type FieldBlockProps = {
  label: ReactNode;
  info?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * `Field` without the wrapping `<label>`, for composite controls (date pickers, chip
 * groups): a label forwards clicks to its first input, which would steal them from the
 * buttons inside.
 */
export function FieldBlock({ label, info, hint, error, optional, children, className }: FieldBlockProps) {
  return (
    <div role="group" aria-label={typeof label === "string" ? label : undefined} className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="flex min-w-0 items-center gap-1.5 text-sm leading-5 font-medium text-ink">
        <span className="min-w-0">{label}</span>
        {optional ? <span className="text-xs font-normal text-fg-subtle">{optional}</span> : null}
        {info ? (
          <InfoTip inline label={typeof label === "string" ? label : "Info"}>
            {info}
          </InfoTip>
        ) : null}
      </span>
      {children}
      {hint && !error ? <span className="text-[13px] leading-5 text-fg-subtle">{hint}</span> : null}
      {error ? (
        <span role="alert" className="flex items-start gap-1.5 text-[13px] leading-5 text-danger">
          <Icon name="circle-xmark" className="mt-0.5 text-xs" />
          <span className="min-w-0">{error}</span>
        </span>
      ) : null}
    </div>
  );
}

/** A switch with its label and explanation, inside an option group. */
export function ToggleRow({
  label,
  description,
  info,
  control,
}: {
  label: ReactNode;
  description?: ReactNode;
  info?: ReactNode;
  control: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 rounded-md border border-border-subtle bg-surface-subtle p-4">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
          {label}
          {info ? (
            <InfoTip inline label={typeof label === "string" ? label : "Info"}>
              {info}
            </InfoTip>
          ) : null}
        </span>
        {description ? <span className="text-[13px] leading-5 text-fg-muted">{description}</span> : null}
      </span>
      {control}
    </div>
  );
}

type SocialPreviewProps = {
  title: string;
  description: string;
  image: string | null;
  domain: string;
  loading?: boolean;
};

/**
 * Roughly how Facebook, X, WhatsApp or Slack draw the link card: big image, the site's
 * domain in small capitals, then title and description.
 */
export function SocialPreviewCard({ title, description, image, domain, loading = false }: SocialPreviewProps) {
  const t = useTranslations("links");
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-md border border-border bg-bg",
        loading && "animate-pulse",
      )}
      aria-label={t("form.previewCardLabel")}
    >
      {image ? (
        // Remote og:image or an uploaded media path; shown as-is, never stored.
        <img
          src={image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="aspect-[1.91/1] w-full border-b border-border-subtle bg-surface object-cover"
        />
      ) : (
        <div className="flex aspect-[2.6/1] w-full flex-col items-center justify-center gap-1.5 border-b border-border-subtle bg-surface text-fg-subtle">
          <Icon name="image" className="text-lg" />
          <span className="text-xs">{t("form.previewNoImage")}</span>
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-0.5 bg-surface-subtle px-3.5 py-3">
        <span className="truncate text-[11px] font-medium tracking-wide text-fg-subtle uppercase">{domain}</span>
        <span className="line-clamp-2 text-sm leading-5 font-semibold text-ink">
          {title || t("form.previewNoTitle")}
        </span>
        {description ? <span className="line-clamp-2 text-[13px] leading-5 text-fg-muted">{description}</span> : null}
      </div>
    </div>
  );
}

export type SummaryItem = { id: string; icon: IconName; text: ReactNode; tone?: "default" | "warn" };

/** "How this link behaves" in plain sentences, next to the form. */
export function BehaviourSummary({ items }: { items: SummaryItem[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
      {items.map((item) => (
        <li key={item.id} className="flex min-w-0 items-start gap-2.5 text-[13px] leading-5">
          <span
            aria-hidden="true"
            className={cn(
              "mt-px flex size-5 shrink-0 items-center justify-center rounded-xs",
              item.tone === "warn" ? "bg-warn-surface text-warn" : "bg-surface text-fg-muted",
            )}
          >
            <Icon name={item.icon} className="text-[10px]" />
          </span>
          <span className="min-w-0 break-words text-ink">{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

/** Apps the "open in app" mode knows, as the edge lists them (`@short/core` open-mode). */
export const SUPPORTED_APPS: { id: string; name: string; icon: IconName | null }[] = [
  { id: "youtube", name: "YouTube", icon: "youtube" },
  { id: "instagram", name: "Instagram", icon: "instagram" },
  { id: "tiktok", name: "TikTok", icon: "tiktok" },
  { id: "twitter", name: "X", icon: "x-twitter" },
  { id: "facebook", name: "Facebook", icon: "facebook" },
  { id: "spotify", name: "Spotify", icon: null },
  { id: "linkedin", name: "LinkedIn", icon: "linkedin" },
  { id: "whatsapp", name: "WhatsApp", icon: "whatsapp" },
  { id: "telegram", name: "Telegram", icon: "telegram" },
  { id: "pinterest", name: "Pinterest", icon: null },
];

export function AppChips({ highlight }: { highlight?: string | null }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
      {SUPPORTED_APPS.map((app) => (
        <li
          key={app.id}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-pill border px-2.5 text-xs font-medium",
            highlight === app.id
              ? "border-accent-border bg-accent-surface text-accent-on-surface"
              : "border-border bg-bg text-fg-muted",
          )}
        >
          <Icon name={app.icon ?? "mobile-screen"} className="text-[11px]" />
          {app.name}
        </li>
      ))}
    </ul>
  );
}

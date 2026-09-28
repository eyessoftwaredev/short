"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/kit/icon";
import { cn } from "@/lib/cx";

type CalloutTone = "info" | "success" | "warn" | "danger" | "accent" | "neutral";

type CalloutProps = {
  tone?: CalloutTone;
  /** Bold first line. Keep it to one short sentence. */
  title?: ReactNode;
  /** Supporting text. Say what happened and what to do next. */
  children?: ReactNode;
  /** Kit icon name, or `false` to hide. Defaults to the tone's icon. */
  icon?: IconName | false;
  /** Buttons/links on the right (wraps under the text on narrow screens). */
  actions?: ReactNode;
  /** Shows a close button; the callout hides itself and then calls this. */
  onDismiss?: () => void;
  /** Adds a close button that only hides the callout locally. */
  dismissible?: boolean;
  className?: string;
};

const toneClasses: Record<CalloutTone, { box: string; icon: string; title: string }> = {
  info: { box: "border-info-border bg-info-surface", icon: "text-info", title: "text-info-ink" },
  success: {
    box: "border-success-border bg-success-surface",
    icon: "text-success",
    title: "text-success-ink",
  },
  warn: { box: "border-warn-border bg-warn-surface", icon: "text-warn", title: "text-warn-ink" },
  danger: {
    box: "border-danger-border bg-danger-surface",
    icon: "text-danger",
    title: "text-danger-ink",
  },
  accent: {
    box: "border-accent-border bg-accent-tint",
    icon: "text-accent",
    title: "text-accent-on-surface",
  },
  neutral: { box: "border-border bg-bg", icon: "text-fg-subtle", title: "text-ink" },
};

const defaultIcons: Record<CalloutTone, IconName> = {
  info: "circle-info",
  success: "circle-check",
  warn: "warning",
  danger: "circle-xmark",
  accent: "sparkles",
  neutral: "circle-info",
};

/**
 * Inline message block. Use for quota warnings, "what this page does" intros,
 * success after a redirect, and errors that need more than a field message.
 *
 *   <Callout tone="warn" title="You're close to your link limit"
 *            actions={<Button size="sm" href="/billing">See plans</Button>}>
 *     23 of 25 links used on the Free plan.
 *   </Callout>
 */
export function Callout({
  tone = "info",
  title,
  children,
  icon,
  actions,
  onDismiss,
  dismissible = false,
  className,
}: CalloutProps) {
  const t = useTranslations("common");
  const [hidden, setHidden] = useState(false);
  if (hidden) {
    return null;
  }
  const styles = toneClasses[tone];
  const glyph = icon === false ? null : (icon ?? defaultIcons[tone]);
  const canDismiss = dismissible || onDismiss != null;
  const live = tone === "danger" || tone === "warn";

  return (
    <div
      role={live ? "alert" : "status"}
      className={cn(
        "flex min-w-0 flex-wrap items-start gap-x-3 gap-y-3 rounded-md border px-4 py-3",
        styles.box,
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 basis-64 items-start gap-3">
        {glyph ? <Icon name={glyph} className={cn("mt-0.5 text-sm", styles.icon)} /> : null}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm leading-5">
          {title ? <p className={cn("m-0 font-semibold", styles.title)}>{title}</p> : null}
          {children ? <div className="min-w-0 text-ink/85">{children}</div> : null}
        </div>
      </div>
      {actions || canDismiss ? (
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {canDismiss ? (
            <button
              type="button"
              aria-label={t("dismiss")}
              onClick={() => {
                setHidden(true);
                onDismiss?.();
              }}
              className="flex size-7 items-center justify-center rounded-sm text-fg-subtle transition-colors duration-150 hover:bg-bg/60 hover:text-ink"
            >
              <Icon name="xmark" className="text-xs" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

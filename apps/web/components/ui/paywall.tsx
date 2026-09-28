"use client";

import { Icon } from "@/components/kit/icon";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "./button";
import { cn } from "@/lib/cx";

type PaywallProps = {
  /** Plan that unlocks the content, rendered as the eyebrow. */
  plan: string;
  title: string;
  description: string;
  /** Blurred behind the gate so the user sees the shape of what they are missing. */
  preview?: ReactNode;
  actionLabel?: string;
  href?: string;
  className?: string;
};

export function Paywall({
  plan,
  title,
  description,
  preview,
  actionLabel,
  href = "/billing",
  className,
}: PaywallProps) {
  const t = useTranslations("common");
  const resolvedAction = actionLabel ?? t("seePlans");
  return (
    <div
      className={cn(
        "relative flex min-h-48 min-w-0 overflow-hidden rounded-lg border border-border bg-bg shadow-card",
        className,
      )}
    >
      {preview ? (
        <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-3 p-6 opacity-40 blur-sm select-none">
          {preview}
        </div>
      ) : (
        <div className="min-h-48 flex-1" />
      )}

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg/70 p-6 text-center backdrop-blur-[1px]">
        <span className="flex size-10 items-center justify-center rounded-md bg-accent-surface text-accent ring-1 ring-accent-border ring-inset">
          <Icon name="lock" className="text-sm" />
        </span>
        <span className="rounded-sm bg-accent-surface px-2 py-0.5 text-xs font-semibold text-accent-on-surface">{plan}</span>
        <span className="text-base font-semibold">{title}</span>
        <p className="m-0 max-w-[36ch] text-sm text-fg-muted">{description}</p>
        <Button variant="primary" size="sm" href={href} className="mt-1">
          {resolvedAction}
        </Button>
      </div>
    </div>
  );
}

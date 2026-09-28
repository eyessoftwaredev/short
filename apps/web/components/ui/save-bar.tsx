"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cx";

type SaveBarProps = {
  /** The bar only appears once the form differs from its saved state. */
  dirty: boolean;
  saving?: boolean;
  message?: ReactNode;
  onReset?: () => void;
  onSave?: () => void;
  saveLabel?: string;
  resetLabel?: string;
  /** Rendered instead of the default reset/save pair, e.g. for a submit button. */
  actions?: ReactNode;
  className?: string;
};

export function SaveBar({
  dirty,
  saving = false,
  message,
  onReset,
  onSave,
  saveLabel,
  resetLabel,
  actions,
  className,
}: SaveBarProps) {
  const t = useTranslations("common");
  const resolvedMessage = message ?? t("unsavedChanges");
  const resolvedSave = saveLabel ?? t("save");
  const resolvedReset = resetLabel ?? t("discard");
  if (!dirty) {
    return null;
  }

  return (
    <div
      className={cn(
        "animate-slide-in-up sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-toast mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-elevated py-2.5 pr-2.5 pl-4 shadow-toast lg:bottom-5",
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink">
        <span className="size-2 shrink-0 rounded-pill bg-warn" aria-hidden="true" />
        {resolvedMessage}
      </span>
      <span className="flex shrink-0 gap-2">
        {actions ?? (
          <>
            <Button size="sm" variant="ghost" onClick={onReset} disabled={saving}>
              {resolvedReset}
            </Button>
            <Button size="sm" variant="primary" onClick={onSave} loading={saving}>
              {saving ? t("saving") : resolvedSave}
            </Button>
          </>
        )}
      </span>
    </div>
  );
}

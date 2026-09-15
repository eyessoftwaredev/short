"use client";

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
  message = "Unsaved changes",
  onReset,
  onSave,
  saveLabel = "Save",
  resetLabel = "Discard",
  actions,
  className,
}: SaveBarProps) {
  if (!dirty) {
    return null;
  }

  return (
    <div
      className={cn(
        "sticky bottom-4 z-toast flex flex-wrap items-center justify-between gap-4 rounded-default border border-border-strong bg-bg px-4 py-3 shadow-toast",
        className,
      )}
    >
      <span className="text-sm text-fg-muted">{message}</span>
      <span className="flex shrink-0 gap-2">
        {actions ?? (
          <>
            <Button size="sm" onClick={onReset} disabled={saving}>
              {resetLabel}
            </Button>
            <Button size="sm" variant="primary" onClick={onSave} disabled={saving}>
              {saving ? "Saving…" : saveLabel}
            </Button>
          </>
        )}
      </span>
    </div>
  );
}

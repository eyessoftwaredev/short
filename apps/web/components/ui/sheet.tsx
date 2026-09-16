"use client";

import { Icon } from "@/components/kit/icon";

import { useTranslations } from "next-intl";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cx";

type SheetProps = {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  side?: "right" | "bottom";
  /** `lg` fits the targeting-rule builder; `md` fits simple detail panes. */
  size?: "md" | "lg";
};

export function Sheet({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  side = "right",
  size = "md",
}: SheetProps) {
  const t = useTranslations("common");
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      role="presentation"
      className={cn(
        "fixed inset-0 z-modal flex bg-overlay",
        side === "right" ? "justify-end" : "items-end",
      )}
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "flex min-w-0 flex-col bg-bg shadow-modal",
          side === "right"
            ? cn("h-full w-full border-l border-border", size === "lg" ? "max-w-2xl" : "max-w-md")
            : "max-h-[85vh] w-full border-t border-border",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <h3 className="m-0 truncate text-lg font-semibold">{title}</h3>
            {description ? <p className="mt-1 text-sm text-fg-muted">{description}</p> : null}
          </div>
          <Button variant="ghost" icon aria-label={t("close")} onClick={onClose}>
            <Icon name="xmark" className="text-sm" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer ? (
          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">{footer}</div>
        ) : null}
      </aside>
    </div>
  );
}

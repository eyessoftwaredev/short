"use client";

import { Icon } from "@/components/kit/icon";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, type ReactNode } from "react";
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
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      role="presentation"
      className={cn(
        "animate-fade-in fixed inset-0 z-modal flex bg-overlay",
        side === "right" ? "justify-end" : "items-end",
      )}
      onClick={onClose}
    >
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "flex min-w-0 flex-col bg-elevated shadow-modal outline-none",
          side === "right"
            ? cn(
                "animate-slide-in-right h-full w-full border-l border-border",
                size === "lg" ? "max-w-2xl" : "max-w-md",
              )
            : "animate-slide-in-up max-h-[85vh] w-full rounded-t-xl border-t border-border",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border-subtle px-6 py-4">
          <div className="min-w-0 pt-0.5">
            <h2 id={titleId} className="m-0 truncate text-base leading-6 font-semibold text-ink">
              {title}
            </h2>
            {description ? (
              <p className="m-0 mt-0.5 text-sm leading-5 text-fg-muted">{description}</p>
            ) : null}
          </div>
          <Button variant="ghost" icon size="sm" className="-mr-2" aria-label={t("close")} onClick={onClose}>
            <Icon name="xmark" className="text-sm" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border-subtle bg-surface-subtle px-6 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

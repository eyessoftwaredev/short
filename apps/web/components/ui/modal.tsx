"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/kit/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cx";

type ModalSize = "sm" | "md" | "lg" | "xl";

type ModalProps = {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  onClose: () => void;
  /** Right-aligned buttons. Put the primary action last. */
  footer?: ReactNode;
  /** `md` (448px) by default; `lg` for forms, `xl` for previews. */
  size?: ModalSize;
  /** Icon tile left of the title; `danger` tone paints it red. */
  icon?: IconName;
  tone?: "default" | "danger";
};

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-xl",
  xl: "max-w-3xl",
};

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  footer,
  size = "md",
  icon,
  tone = "default",
}: ModalProps) {
  const t = useTranslations("common");
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    // Focus moves into the dialog and returns to whatever opened it on close.
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>(
      "input:not([disabled]):not([type=hidden]), textarea:not([disabled]), select:not([disabled])",
    );
    (first ?? dialog)?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) {
        return;
      }
      // Keep Tab inside the dialog so focus never lands behind the overlay.
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0);
      const firstEl = focusable[0];
      const lastEl = focusable.at(-1);
      if (!firstEl || !lastEl) {
        return;
      }
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
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
      className="animate-fade-in fixed inset-0 z-modal flex items-end justify-center bg-overlay p-3 backdrop-blur-[2px] sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "animate-pop-in flex max-h-[88vh] w-full flex-col overflow-hidden rounded-xl border border-border bg-elevated shadow-modal outline-none",
          sizeClasses[size],
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start gap-3.5 px-6 pt-5 pb-4">
          {icon ? (
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                tone === "danger"
                  ? "bg-danger-surface text-danger"
                  : "bg-accent-surface text-accent-on-surface",
              )}
              aria-hidden="true"
            >
              <Icon name={icon} className="text-sm" />
            </span>
          ) : null}
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id={titleId} className="m-0 text-base leading-6 font-semibold text-ink">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="m-0 mt-1 text-sm leading-5 text-fg-muted">
                {description}
              </p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            icon
            size="sm"
            className="-mt-1 -mr-2"
            aria-label={t("close")}
            onClick={onClose}
          >
            <Icon name="xmark" className="text-sm" />
          </Button>
        </div>
        {children ? <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-5">{children}</div> : null}
        {footer ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border-subtle bg-surface-subtle px-6 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type ConfirmDialogProps = {
  open: boolean;
  title: ReactNode;
  /** Say exactly what will happen and whether it can be undone. */
  description?: ReactNode;
  /** Verb that names the action: "Delete link", not "OK". */
  confirmLabel: ReactNode;
  cancelLabel?: ReactNode;
  /** `danger` (default) for destructive actions. */
  tone?: "danger" | "default";
  /** Shows a spinner on the confirm button and blocks both buttons. */
  loading?: boolean;
  /** Blocks confirm, e.g. until a "type the name to confirm" input matches. */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  /** Extra content between description and buttons (a type-to-confirm input). */
  children?: ReactNode;
};

/**
 * Every destructive action goes through this. Cancel is focused-safe, the
 * confirm button names the action.
 *
 *   <ConfirmDialog open={open} title="Delete this link?"
 *     description="launch-2026 stops redirecting immediately. Click history is kept."
 *     confirmLabel="Delete link" loading={pending}
 *     onConfirm={remove} onClose={() => setOpen(false)} />
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  loading = false,
  confirmDisabled = false,
  onConfirm,
  onClose,
  children,
}: ConfirmDialogProps) {
  const t = useTranslations("common");
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={loading ? () => undefined : onClose}
      size="sm"
      icon={tone === "danger" ? "warning" : "circle-info"}
      tone={tone}
      footer={
        <>
          <Button onClick={onClose} disabled={loading}>
            {cancelLabel ?? t("cancel")}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            className={tone === "danger" ? "border-danger bg-danger text-on-accent hover:bg-danger-hover" : undefined}
            loading={loading}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

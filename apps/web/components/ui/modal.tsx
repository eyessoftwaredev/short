"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
type ModalProps = {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
};

export function Modal({ open, title, description, children, onClose, footer }: ModalProps) {
  const t = useTranslations("common");
  if (!open) {
    return null;
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-modal flex items-center justify-center bg-overlay p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[88vh] w-full max-w-md overflow-auto rounded-default bg-bg shadow-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            {description ? <p className="mt-1 text-sm text-fg-muted">{description}</p> : null}
          </div>
          <Button variant="ghost" icon aria-label={t("close")} onClick={onClose}>
            ×
          </Button>
        </div>
        {children ? <div className="px-6 py-5">{children}</div> : null}
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

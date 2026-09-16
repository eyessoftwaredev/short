"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/cx";

export type ToastItem = {
  id: string;
  title: ReactNode;
  body?: ReactNode;
  icon?: ReactNode;
  iconClassName?: string;
};

type ToastStackProps = {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  className?: string;
};

export function ToastStack({ toasts, onDismiss, className }: ToastStackProps) {
  const t = useTranslations("common");
  return (
    <div className={cn("pointer-events-none fixed right-5 bottom-5 z-toast flex flex-col items-end gap-2.5", className)}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex max-w-sm min-w-72 items-start gap-3 rounded-default border border-border-strong bg-bg p-3.5 shadow-toast"
        >
          {toast.icon ? (
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-sm text-xs text-on-accent",
                toast.iconClassName ?? "bg-fg-muted",
              )}
            >
              {toast.icon}
            </span>
          ) : null}
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-medium">{toast.title}</span>
            {toast.body ? <span className="text-sm text-fg-muted">{toast.body}</span> : null}
          </span>
          <button
            type="button"
            className="shrink-0 text-fg-subtle hover:text-ink"
            onClick={() => onDismiss(toast.id)}
            aria-label={t("dismiss")}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/kit/icon";
import { cn } from "@/lib/cx";

export type ToastTone = "success" | "error" | "warn" | "info" | "neutral";

export type ToastItem = {
  id: string;
  title: ReactNode;
  body?: ReactNode;
  /** Custom glyph. Ignored when `tone` is set — the tone brings its own icon. */
  icon?: ReactNode;
  /** Classes for the custom `icon` tile. */
  iconClassName?: string;
  tone?: ToastTone;
  /** Optional inline action, e.g. "Undo" or "View". */
  action?: { label: ReactNode; onClick: () => void };
};

type ToastStackProps = {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  className?: string;
};

const toneIcon: Record<ToastTone, { name: IconName; className: string }> = {
  success: { name: "circle-check", className: "text-success" },
  error: { name: "circle-xmark", className: "text-danger" },
  warn: { name: "warning", className: "text-warn" },
  info: { name: "circle-info", className: "text-info" },
  neutral: { name: "circle-info", className: "text-fg-subtle" },
};

/** Presentational stack. Most code should call `useToast()` instead. */
export function ToastStack({ toasts, onDismiss, className }: ToastStackProps) {
  const t = useTranslations("common");
  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className={cn(
        "pointer-events-none fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-toast flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end lg:bottom-5",
        className,
      )}
    >
      {toasts.map((toast) => {
        const tone = toast.tone ? toneIcon[toast.tone] : null;
        return (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className="animate-slide-in-up pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border border-border bg-elevated p-3.5 shadow-toast sm:min-w-80"
          >
            {tone ? (
              <Icon name={tone.name} className={cn("mt-0.5 text-base", tone.className)} />
            ) : toast.icon ? (
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-sm text-xs text-on-accent",
                  toast.iconClassName ?? "bg-fg-muted",
                )}
              >
                {toast.icon}
              </span>
            ) : null}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm leading-5 font-medium text-ink">{toast.title}</span>
              {toast.body ? <span className="text-[13px] leading-5 text-fg-muted">{toast.body}</span> : null}
              {toast.action ? (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    onDismiss(toast.id);
                  }}
                  className="mt-1 w-fit text-[13px] font-semibold text-accent-ink hover:underline"
                >
                  {toast.action.label}
                </button>
              ) : null}
            </span>
            <button
              type="button"
              className="-mt-0.5 -mr-1 flex size-6 shrink-0 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:bg-surface hover:text-ink"
              onClick={() => onDismiss(toast.id)}
              aria-label={t("dismiss")}
            >
              <Icon name="xmark" className="text-xs" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

type ToastInput = Omit<ToastItem, "id"> & {
  /** Auto-dismiss delay in ms. Errors stay 8s, everything else 4.5s. `0` = sticky. */
  duration?: number;
};

type ToastFn = ((input: ToastInput) => string) & {
  success: (title: ReactNode, body?: ReactNode) => string;
  error: (title: ReactNode, body?: ReactNode) => string;
  info: (title: ReactNode, body?: ReactNode) => string;
  warn: (title: ReactNode, body?: ReactNode) => string;
  dismiss: (id: string) => void;
};

/*
 * Toasts live in a module-level store rather than React state. Every panel
 * page renders its own PanelShell, so a provider-held list would be wiped by
 * the very navigation that usually follows a "Saved" toast.
 */
let items: ToastItem[] = [];
let counter = 0;
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const EMPTY: ToastItem[] = [];

function emit(next: ToastItem[]): void {
  items = next;
  listeners.forEach((listener) => listener());
}

function dismiss(id: string): void {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  emit(items.filter((item) => item.id !== id));
}

function push(input: ToastInput): string {
  counter += 1;
  const id = `toast-${counter}`;
  const { duration, ...item } = input;
  // Newest at the bottom, and never more than four on screen.
  emit([...items.slice(-3), { ...item, id }]);
  const delay = duration ?? (input.tone === "error" ? 8000 : 4500);
  if (delay > 0 && typeof window !== "undefined") {
    timers.set(
      id,
      setTimeout(() => dismiss(id), delay),
    );
  }
  return id;
}

/**
 * Fire-and-forget notifications, callable from any client code:
 * `toast.success("Link saved")`, `toast.error("Could not save", reason)`,
 * `toast({ title, tone: "info", action: { label: "Undo", onClick } })`.
 */
export const toast: ToastFn = Object.assign(push, {
  success: (title: ReactNode, body?: ReactNode) => push({ title, body, tone: "success" }),
  error: (title: ReactNode, body?: ReactNode) => push({ title, body, tone: "error" }),
  info: (title: ReactNode, body?: ReactNode) => push({ title, body, tone: "info" }),
  warn: (title: ReactNode, body?: ReactNode) => push({ title, body, tone: "warn" }),
  dismiss,
});

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Renders the live toast stack. Mounted once by `PanelShell`. */
export function Toaster() {
  const current = useSyncExternalStore(
    subscribe,
    () => items,
    () => EMPTY,
  );
  return <ToastStack toasts={current} onDismiss={dismiss} />;
}

/** Wraps children and mounts a `Toaster`. Kept for code that prefers a provider. */
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}

/** Hook form of `toast` — same object, provided for symmetry with other hooks. */
export function useToast(): ToastFn {
  return toast;
}

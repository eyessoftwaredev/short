"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/kit/icon";
import { cn } from "@/lib/cx";

type InfoTipProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export function InfoTip({ label, children, className }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current?.getBoundingClientRect();
    if (!trigger) {
      return;
    }
    const panel = panelRef.current?.getBoundingClientRect();
    const width = panel?.width ?? 280;
    const height = panel?.height ?? 160;
    const gap = 8;
    let left = trigger.right - width;
    let top = trigger.bottom + gap;
    if (left < 8) {
      left = 8;
    }
    if (left + width > window.innerWidth - 8) {
      left = window.innerWidth - width - 8;
    }
    if (top + height > window.innerHeight - 8 && trigger.top - gap - height > 8) {
      top = trigger.top - gap - height;
    }
    setCoords({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (open) {
      updatePosition();
    }
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex size-6 items-center justify-center rounded-pill border border-border bg-surface text-fg-muted hover:border-border-strong hover:text-ink"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Icon name="circle-info" className="text-xs" aria-hidden="true" />
      </button>
      {open && coords
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="note"
              className="fixed z-dropdown w-72 max-w-[calc(100vw-1rem)] rounded-default border border-border bg-bg p-3 shadow-pop"
              style={{ top: coords.top, left: coords.left }}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}

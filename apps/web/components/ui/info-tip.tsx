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
import type React from "react";
import { Icon } from "@/components/kit/icon";
import { cn } from "@/lib/cx";

type InfoTipProps = {
  label: string;
  children: ReactNode;
  className?: string;
  /**
   * Renders the trigger as a focusable `span` instead of a `button`. A button is a
   * labelable element, so inside a `<label>` it would steal the label's click from the
   * input it describes; `Field` uses this mode.
   */
  inline?: boolean;
};

/** Delay before a hover-opened panel closes, so the pointer can travel into it. */
const HOVER_CLOSE_MS = 120;

export function InfoTip({ label, children, className, inline = false }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelId = useId();

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);
  const openNow = useCallback(() => {
    cancelClose();
    setOpen(true);
  }, [cancelClose]);
  const closeSoon = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), HOVER_CLOSE_MS);
  }, [cancelClose]);

  useEffect(() => cancelClose, [cancelClose]);

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

  const triggerClass =
    "inline-flex size-5 cursor-help items-center justify-center rounded-pill border border-border bg-surface text-fg-muted hover:border-border-strong hover:text-ink focus-visible:outline-2";
  const triggerProps = {
    "aria-label": label,
    "aria-expanded": open,
    "aria-controls": open ? panelId : undefined,
    onMouseEnter: openNow,
    onMouseLeave: closeSoon,
    onFocus: openNow,
    onBlur: closeSoon,
  };
  const icon = <Icon name="circle-info" className="text-[0.65rem]" aria-hidden="true" />;

  return (
    <span className={cn("relative inline-flex shrink-0 align-middle", className)}>
      {inline ? (
        <span
          ref={triggerRef as React.RefObject<HTMLSpanElement>}
          role="button"
          tabIndex={0}
          className={triggerClass}
          {...triggerProps}
          onClick={(event) => {
            // Inside a <label> the click would otherwise focus the described input.
            event.preventDefault();
            event.stopPropagation();
            setOpen((prev) => !prev);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen((prev) => !prev);
            }
          }}
        >
          {icon}
        </span>
      ) : (
        <button
          ref={triggerRef as React.RefObject<HTMLButtonElement>}
          type="button"
          className={triggerClass}
          {...triggerProps}
          onClick={() => setOpen((prev) => !prev)}
        >
          {icon}
        </button>
      )}
      {open && coords
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="note"
              className="fixed z-toast w-72 max-w-[calc(100vw-1rem)] rounded-default border border-border bg-bg p-3 text-sm font-normal text-fg shadow-pop"
              style={{ top: coords.top, left: coords.left }}
              onMouseEnter={cancelClose}
              onMouseLeave={closeSoon}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cx";

export type DropdownItem = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  onSelect?: () => void;
  href?: string;
  /** Opens `href` in a new tab without handing the panel over as `window.opener`. */
  external?: boolean;
  danger?: boolean;
  disabled?: boolean;
  /** Draws a divider above this item. */
  separated?: boolean;
  /** Renders a non-interactive group label ("Teams") instead of an action. */
  heading?: boolean;
  /** Second, muted line under the label. */
  description?: ReactNode;
  /** Right-aligned hint, e.g. a keyboard shortcut or a count. */
  shortcut?: ReactNode;
  /** Marks the current choice (workspace switcher, sort order). */
  selected?: boolean;
};

type DropdownProps = {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "start" | "end";
  /** Names the menu for assistive tech, e.g. "Link actions". */
  label?: string;
  className?: string;
};

/**
 * In-app pages navigate client-side; API routes (exports, downloads) and
 * anything absolute stay plain anchors so they are never prefetched.
 */
function isAppRoute(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/api/");
}

type MenuCoords = { top: number; left: number; minWidth: number };

function menuCoords(
  trigger: DOMRect,
  menu: DOMRect | undefined,
  align: "start" | "end",
): MenuCoords {
  const gap = 4;
  const minWidth = Math.max(200, trigger.width);
  const height = menu?.height ?? 0;
  let left = align === "end" ? trigger.right - minWidth : trigger.left;
  let top = trigger.bottom + gap;

  if (left < 8) {
    left = 8;
  }
  if (left + minWidth > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - minWidth - 8);
  }
  if (height > 0 && top + height > window.innerHeight - 8 && trigger.top - gap - height > 8) {
    top = trigger.top - gap - height;
  }

  return { top, left, minWidth };
}

export function Dropdown({ trigger, items, align = "end", label, className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const updatePosition = useCallback(() => {
    const triggerBox = containerRef.current?.getBoundingClientRect();
    if (!triggerBox) {
      return;
    }
    setCoords(menuCoords(triggerBox, menuRef.current?.getBoundingClientRect(), align));
  }, [align]);

  const focusItem = useCallback((index: number) => {
    const nodes = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)');
    if (!nodes?.length) {
      return;
    }
    const wrapped = (index + nodes.length) % nodes.length;
    nodes[wrapped]?.focus();
  }, []);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) {
      containerRef.current?.querySelector<HTMLElement>("button, a, [tabindex]")?.focus();
    }
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
      if (containerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
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
  }, [open, close, updatePosition]);

  useEffect(() => {
    if (open) {
      focusItem(0);
    }
  }, [open, focusItem]);

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const nodes = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [],
    );
    const current = nodes.indexOf(document.activeElement as HTMLElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItem(current + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusItem(current - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusItem(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusItem(nodes.length - 1);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  const menu =
    open && coords ? (
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-label={label}
        onKeyDown={onMenuKeyDown}
        className="animate-pop-in fixed z-dropdown flex max-h-[min(28rem,70vh)] min-w-44 flex-col overflow-y-auto rounded-md border border-border bg-elevated p-1 shadow-pop"
        style={{ top: coords.top, left: coords.left, minWidth: coords.minWidth }}
      >
        {items.map((item) => {
          if (item.heading) {
            return (
              <span key={item.id} className="contents">
                {item.separated ? <span className="-mx-1 my-1 h-px bg-border-subtle" /> : null}
                {item.description ? (
                  // A heading with a second line is a profile header ("Ada · ada@x.io").
                  <span role="presentation" className="flex min-w-0 flex-col px-2.5 pt-2 pb-2">
                    <span className="truncate text-sm font-semibold text-ink">{item.label}</span>
                    <span className="truncate text-xs text-fg-subtle">{item.description}</span>
                  </span>
                ) : (
                  <span
                    role="presentation"
                    className="px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-fg-subtle uppercase"
                  >
                    {item.label}
                  </span>
                )}
              </span>
            );
          }

          const content = (
            <>
              {item.icon ? (
                <span
                  className={cn(
                    "flex w-4 shrink-0 items-center justify-center",
                    item.danger ? "text-danger" : "text-fg-subtle",
                  )}
                >
                  {item.icon}
                </span>
              ) : null}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{item.label}</span>
                {item.description ? (
                  <span className="truncate text-xs text-fg-subtle">{item.description}</span>
                ) : null}
              </span>
              {item.shortcut ? (
                <span className="ml-3 shrink-0 text-xs text-fg-subtle">{item.shortcut}</span>
              ) : null}
              {item.selected ? (
                <span className="ml-2 shrink-0 text-accent" aria-hidden="true">
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              ) : null}
            </>
          );

          const itemClass = cn(
            "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-left text-sm leading-5 no-underline transition-colors duration-100 focus-visible:outline-none",
            item.description ? "min-h-10" : "min-h-8",
            item.disabled
              ? "cursor-not-allowed text-fg-disabled"
              : item.danger
                ? "text-danger hover:bg-danger-surface focus-visible:bg-danger-surface"
                : "text-ink hover:bg-surface hover:text-ink hover:no-underline focus-visible:bg-surface",
          );

          return (
            <span key={item.id} className="contents">
              {item.separated ? <span className="-mx-1 my-1 h-px bg-border-subtle" /> : null}
              {item.href && !item.disabled && (item.external || !isAppRoute(item.href)) ? (
                <a
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  role="menuitem"
                  tabIndex={-1}
                  aria-current={item.selected || undefined}
                  className={itemClass}
                  onClick={() => setOpen(false)}
                >
                  {content}
                </a>
              ) : item.href && !item.disabled ? (
                // Client-side navigation for in-app destinations.
                <Link
                  href={item.href}
                  prefetch={false}
                  role="menuitem"
                  tabIndex={-1}
                  aria-current={item.selected || undefined}
                  className={itemClass}
                  onClick={() => setOpen(false)}
                >
                  {content}
                </Link>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  aria-current={item.selected || undefined}
                  disabled={item.disabled}
                  className={itemClass}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect?.();
                  }}
                >
                  {content}
                </button>
              )}
            </span>
          );
        })}
      </div>
    ) : null;

  return (
    <div ref={containerRef} className={cn("relative inline-flex min-w-0", className)}>
      <span
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn("inline-flex min-w-0", className?.includes("w-full") && "w-full")}
      >
        {trigger}
      </span>
      {menu && typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </div>
  );
}

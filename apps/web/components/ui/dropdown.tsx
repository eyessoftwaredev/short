"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cx";

export type DropdownItem = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  onSelect?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
  /** Draws a divider above this item. */
  separated?: boolean;
};

type DropdownProps = {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "start" | "end";
  /** Names the menu for assistive tech, e.g. "Link actions". */
  label?: string;
  className?: string;
};

export function Dropdown({ trigger, items, align = "end", label, className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

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
      // Sending focus back to the trigger keeps the tab order intact after the
      // menu unmounts, instead of dropping the user at the top of the page.
      containerRef.current?.querySelector<HTMLElement>("button, a, [tabindex]")?.focus();
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

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

  return (
    <div ref={containerRef} className={cn("relative inline-flex min-w-0", className)}>
      {/*
        The wrapper carries the menu relationship but stays non-focusable: the
        trigger passed in is already a real button, and giving the wrapper
        `role="button"` too would produce a second tab stop with duplicate
        semantics. Activation reaches us by bubbling.
      */}
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

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className={cn(
            "absolute top-full z-dropdown mt-1 flex min-w-44 flex-col rounded-default border border-border bg-bg p-1 shadow-pop",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => {
            const content = (
              <>
                {item.icon ? <span className="flex size-4 shrink-0 items-center">{item.icon}</span> : null}
                <span className="min-w-0 truncate">{item.label}</span>
              </>
            );

            const itemClass = cn(
              "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm no-underline transition duration-150",
              item.disabled
                ? "cursor-not-allowed text-fg-disabled"
                : item.danger
                  ? "text-danger hover:bg-danger-surface focus-visible:bg-danger-surface"
                  : "text-ink hover:bg-surface hover:no-underline focus-visible:bg-surface",
            );

            return (
              <span key={item.id} className="contents">
                {item.separated ? <span className="my-1 h-px bg-border" /> : null}
                {item.href && !item.disabled ? (
                  <a
                    href={item.href}
                    role="menuitem"
                    tabIndex={-1}
                    className={itemClass}
                    onClick={() => setOpen(false)}
                  >
                    {content}
                  </a>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
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
      ) : null}
    </div>
  );
}

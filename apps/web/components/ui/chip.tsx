"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cx";

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  active?: boolean;
  /** Dims the chip while the filter it triggers is still resolving. */
  pending?: boolean;
  size?: "sm" | "md";
};

export function Chip({
  children,
  active = false,
  pending = false,
  size = "md",
  className,
  type = "button",
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      // Chips are used as filter toggles, so the pressed state has to be
      // exposed, not just painted.
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-pill border font-medium whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[13px]",
        active
          ? "border-accent-border bg-accent-surface text-accent-on-surface"
          : "border-border bg-bg text-fg-muted shadow-xs hover:border-border-strong hover:text-ink",
        pending && "pointer-events-none opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cx";

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  active?: boolean;
  /** Dims the chip while the filter it triggers is still resolving. */
  pending?: boolean;
};

export function Chip({
  children,
  active = false,
  pending = false,
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
        "inline-flex items-center gap-1.5 rounded-pill border border-border-strong bg-bg px-3 py-1.5 text-sm transition duration-200 hover:-translate-y-px hover:bg-surface disabled:pointer-events-none disabled:opacity-50",
        active && "border-accent bg-accent-surface font-medium text-accent-on-surface",
        pending && "pointer-events-none opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

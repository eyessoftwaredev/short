"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cx";

type SwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export function Switch({ checked = false, onCheckedChange, className, onClick, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cn(
        "relative h-6 w-10 shrink-0 rounded-pill border-0 p-0 transition duration-200 hover:scale-105",
        checked ? "bg-accent" : "bg-border-strong",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          onCheckedChange?.(!checked);
        }
      }}
      {...props}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-4 rounded-full bg-on-accent transition-transform duration-150",
          checked && "translate-x-4.5",
        )}
      />
    </button>
  );
}

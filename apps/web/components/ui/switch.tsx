"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cx";

type SwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** `sm` for dense tables, `md` (default) for forms and settings rows. */
  size?: "sm" | "md";
};

/** On/off toggle. Always give it a visible label (SettingsRow/Field) or `aria-label`. */
export function Switch({
  checked = false,
  onCheckedChange,
  size = "md",
  className,
  onClick,
  ...props
}: SwitchProps) {
  const small = size === "sm";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-pill border-0 p-0.5 transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        small ? "h-4.5 w-8" : "h-6 w-10.5",
        checked ? "bg-accent hover:bg-accent-hover" : "bg-border-strong hover:bg-border-hover",
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
          "block rounded-full bg-switch-knob shadow-[0_1px_2px_rgba(16,24,40,0.2)] transition-transform duration-200",
          small ? "size-3.5" : "size-5",
          checked && (small ? "translate-x-3.5" : "translate-x-4.5"),
        )}
      />
    </button>
  );
}

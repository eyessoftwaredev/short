import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cx";

type AvatarProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  /** `square` for workspaces/teams, `circle` (default) for people. */
  shape?: "circle" | "square";
  /** `accent` (default) is the soft brand tint; `inverse` the legacy dark disc. */
  tone?: "accent" | "neutral" | "inverse";
};

const sizeClasses = {
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-11 text-base",
} as const;

const toneClasses = {
  accent: "bg-accent-surface text-accent-on-surface ring-1 ring-accent-border ring-inset",
  neutral: "bg-surface-strong text-fg-muted ring-1 ring-border ring-inset",
  inverse: "bg-inverse text-on-inverse",
} as const;

export function Avatar({
  children,
  size = "md",
  shape = "circle",
  tone = "accent",
  className,
  ...props
}: AvatarProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center font-semibold select-none",
        shape === "circle" ? "rounded-full" : "rounded-default",
        sizeClasses[size],
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

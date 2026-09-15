import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cx";

type KbdProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function Kbd({ children, className, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-xs border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-xs text-fg-muted",
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}

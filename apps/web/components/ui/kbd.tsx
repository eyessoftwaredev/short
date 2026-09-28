import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cx";

type KbdProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

/** A keyboard key hint, e.g. `<Kbd>⌘K</Kbd>` or `<Kbd>Esc</Kbd>`. */
export function Kbd({ children, className, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-border bg-surface-subtle px-1.5 font-sans text-[11px] leading-none font-medium text-fg-subtle shadow-[inset_0_-1px_0_var(--border)]",
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}

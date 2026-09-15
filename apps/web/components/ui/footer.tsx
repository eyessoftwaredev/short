import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cx";

type FooterProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function Footer({ children, className, ...props }: FooterProps) {
  return (
    <footer
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-4 text-sm text-fg-muted",
        className,
      )}
      {...props}
    >
      {children}
    </footer>
  );
}

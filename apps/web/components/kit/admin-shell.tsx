import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cx";

type AdminShellProps = {
  sidebar: ReactNode;
  topbar?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/**
 * Generic rail + content frame. The real panel and /admin both use
 * `components/shell/panel-shell.tsx`; this stays for the /docs kit catalog.
 * The utility classes give it the panel's canvas and flex frame when mounted
 * outside the catalog; wrap page content in `page-container px-4 sm:px-6
 * lg:px-8` for the panel's column. Inside the catalog its unlayered
 * `.kit-shell` / `.kit-main` rules still take precedence.
 */
export function AdminShell({ sidebar, topbar, children, className, style }: AdminShellProps) {
  return (
    <div className={cn("kit-shell flex min-h-screen bg-canvas text-ink", className)} style={style}>
      {sidebar}
      <div className="kit-main flex min-w-0 flex-1 flex-col">
        {topbar}
        {children}
      </div>
    </div>
  );
}

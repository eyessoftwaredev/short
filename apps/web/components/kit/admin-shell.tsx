import type { CSSProperties, ReactNode } from "react";

type AdminShellProps = {
  sidebar: ReactNode;
  topbar?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function AdminShell({ sidebar, topbar, children, className, style }: AdminShellProps) {
  const shellClass = ["kit-shell", className].filter(Boolean).join(" ");
  return (
    <div className={shellClass} style={style}>
      {sidebar}
      <div className="kit-main">
        {topbar}
        {children}
      </div>
    </div>
  );
}

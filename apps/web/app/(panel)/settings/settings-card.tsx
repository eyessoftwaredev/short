import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/cx";

export function SettingsCard({
  title,
  description,
  danger = false,
  children,
  footer,
}: {
  title: ReactNode;
  description?: ReactNode;
  danger?: boolean;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card
      staticHover
      className={cn("gap-5 bg-surface p-6", danger && "border-danger")}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className={cn("m-0 text-base font-semibold tracking-tight", danger && "text-danger")}>
          {title}
        </h3>
        {description ? <p className="m-0 text-sm leading-relaxed text-fg-muted">{description}</p> : null}
      </div>
      {children}
      {footer ? <div className="flex min-w-0 flex-wrap items-center gap-2">{footer}</div> : null}
    </Card>
  );
}

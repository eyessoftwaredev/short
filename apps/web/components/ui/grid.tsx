import type { ReactNode } from "react";
import { cn } from "@/lib/cx";

type GridColumns = 2 | 3 | 4 | 12;

type GridProps = {
  columns?: GridColumns;
  children: ReactNode;
  className?: string;
};

const columnClasses: Record<GridColumns, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  12: "grid-cols-12",
};

export function Grid({ columns = 3, children, className }: GridProps) {
  return (
    <div className={cn("grid min-w-0 gap-4 *:min-w-0", columnClasses[columns], className)}>{children}</div>
  );
}

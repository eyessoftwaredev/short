import type { ReactNode } from "react";
import type { GridColumns } from "./types";

type GridProps = {
  columns?: GridColumns;
  children: ReactNode;
  className?: string;
};

export function Grid({ columns = 3, children, className }: GridProps) {
  const gridClass = [
    "kit-grid",
    columns === 2 ? "kit-grid--2" : "",
    columns === 3 ? "kit-grid--3" : "",
    columns === 4 ? "kit-grid--4" : "",
    columns === 12 ? "kit-grid--12" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={gridClass}>{children}</div>;
}

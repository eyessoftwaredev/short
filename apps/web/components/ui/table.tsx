import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cx";

type TableDensity = "comfortable" | "compact";

type TableProps = HTMLAttributes<HTMLTableElement> & {
  children: ReactNode;
  /**
   * Pins the header while the body scrolls. Needs a bounded height, so it also
   * caps the wrapper — a long list stays browsable without losing the column
   * names.
   */
  stickyHeader?: boolean;
  /** Tightens row padding for dense lists. Header stays the same height. */
  density?: TableDensity;
  /** Dims and freezes the table while a navigation or refetch is in flight. */
  pending?: boolean;
  /** Announced by screen readers in place of a visible caption. */
  label?: string;
  wrapperClassName?: string;
};

const densityCell: Record<TableDensity, string> = {
  comfortable: "px-3.5 py-3",
  compact: "px-3 py-2",
};

export function Table({
  className,
  children,
  stickyHeader = false,
  density = "comfortable",
  pending = false,
  label,
  wrapperClassName,
  ...props
}: TableProps) {
  return (
    <div
      className={cn(
        "relative min-w-0 overflow-x-auto rounded-default border border-border bg-bg",
        // `overflow-x` already makes this a scroll container on both axes, so
        // the header only needs a ceiling to stick against.
        stickyHeader && "table-viewport",
        pending && "pointer-events-none opacity-60",
        wrapperClassName,
      )}
      aria-busy={pending || undefined}
    >
      <table
        data-density={density}
        aria-label={label}
        className={cn("w-full border-collapse text-sm", className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

type TableHeadProps = HTMLAttributes<HTMLTableSectionElement> & {
  /** Pairs with `<Table stickyHeader>`; harmless on a short table. */
  sticky?: boolean;
};

export function TableHead({ className, children, sticky = false, ...props }: TableHeadProps) {
  return (
    // Sticky positioning is applied to the cells in CSS, not here: with
    // `border-collapse: collapse` several browsers drop a background painted on
    // `<thead>` once it detaches.
    <thead data-sticky={sticky || undefined} className={cn("bg-surface-subtle", className)} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn(className)} {...props}>
      {children}
    </tbody>
  );
}

type TableRowProps = HTMLAttributes<HTMLTableRowElement> & {
  /** Current selection or the row a detail panel is showing. */
  selected?: boolean;
  /** The whole row navigates; adds a pointer and a keyboard focus ring. */
  interactive?: boolean;
};

export function TableRow({
  className,
  children,
  selected = false,
  interactive = false,
  ...props
}: TableRowProps) {
  return (
    <tr
      data-selected={selected || undefined}
      aria-selected={selected || undefined}
      className={cn(
        "transition-colors duration-150",
        // `focus-within` gives a keyboard user the same row highlight a mouse
        // user gets on hover.
        selected ? "bg-row-selected" : "hover:bg-row-hover focus-within:bg-row-hover",
        interactive && "cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

type TableCellAlign = "left" | "right" | "center";

const alignClasses: Record<TableCellAlign, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

type TableHeaderCellProps = ThHTMLAttributes<HTMLTableCellElement> & {
  align?: TableCellAlign;
  /** Right-aligns the label so it sits over its column of figures. */
  numeric?: boolean;
};

export function TableHeaderCell({
  className,
  children,
  align,
  numeric = false,
  ...props
}: TableHeaderCellProps) {
  const resolved = align ?? (numeric ? "right" : "left");
  return (
    <th
      scope="col"
      className={cn(
        // Small, uppercase and muted: column names are chrome, the figures
        // underneath are the content.
        "border-b border-border px-3.5 py-2.5 text-xs font-medium tracking-wide text-fg-subtle uppercase",
        alignClasses[resolved],
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

type TableCellProps = TdHTMLAttributes<HTMLTableCellElement> & {
  align?: TableCellAlign;
  /** Tabular, right-aligned figures so digits line up down the column. */
  numeric?: boolean;
  /** Stops a long value from widening the column. */
  truncate?: boolean;
};

export function TableCell({
  className,
  children,
  align,
  numeric = false,
  truncate = false,
  ...props
}: TableCellProps) {
  const resolved = align ?? (numeric ? "right" : "left");
  return (
    <td
      className={cn(
        "border-b border-border-subtle px-3.5 py-3 align-middle",
        alignClasses[resolved],
        numeric && "numeric font-mono whitespace-nowrap",
        truncate && "max-w-0 truncate",
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

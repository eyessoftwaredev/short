import type { ReactNode } from "react";
import { cn } from "@/lib/cx";
import { CopyButton } from "./copy-button";
import { InfoTip } from "./info-tip";

export type KeyValueItem = {
  /** Stable key; falls back to the index. */
  id?: string;
  label: ReactNode;
  value: ReactNode;
  info?: ReactNode;
  /** Adds an icon-only copy button that copies this string. */
  copy?: string;
  /** Monospace value (IDs, URLs, hashes). */
  mono?: boolean;
};

type KeyValueProps = {
  items: KeyValueItem[];
  /**
   * `rows` (default): label left, value right, divided — for detail panels.
   * `grid`: label above value in 2–3 columns — for summary blocks.
   */
  layout?: "rows" | "grid";
  columns?: 2 | 3;
  className?: string;
};

const gridColumns = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
} as const;

/**
 * Definition list for record details: created date, owner, domain, IDs.
 *
 *   <KeyValue items={[{ label: "Created", value: "12 Mar 2026" },
 *                     { label: "Link ID", value: id, mono: true, copy: id }]} />
 */
export function KeyValue({ items, layout = "rows", columns = 2, className }: KeyValueProps) {
  if (layout === "grid") {
    return (
      <dl className={cn("m-0 grid min-w-0 grid-cols-1 gap-x-6 gap-y-4", gridColumns[columns], className)}>
        {items.map((item, index) => (
          <div key={item.id ?? index} className="flex min-w-0 flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-[13px] text-fg-muted">
              {item.label}
              {item.info ? (
                <InfoTip label={typeof item.label === "string" ? item.label : "Info"}>{item.info}</InfoTip>
              ) : null}
            </dt>
            <dd className="m-0 flex min-w-0 items-center gap-1 text-sm font-medium text-ink">
              <span className={cn("min-w-0 truncate", item.mono && "font-mono text-[13px]")}>
                {item.value}
              </span>
              {item.copy ? <CopyButton value={item.copy} iconOnly className="-my-1" /> : null}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl className={cn("m-0 flex min-w-0 flex-col divide-y divide-border-subtle", className)}>
      {items.map((item, index) => (
        <div
          key={item.id ?? index}
          className="grid min-w-0 grid-cols-1 gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(8rem,1fr)_2fr] sm:gap-4"
        >
          <dt className="flex items-center gap-1.5 text-sm text-fg-muted">
            {item.label}
            {item.info ? (
              <InfoTip label={typeof item.label === "string" ? item.label : "Info"}>{item.info}</InfoTip>
            ) : null}
          </dt>
          <dd className="m-0 flex min-w-0 items-center gap-1 text-sm text-ink">
            <span className={cn("min-w-0 truncate", item.mono && "font-mono text-[13px]")}>{item.value}</span>
            {item.copy ? <CopyButton value={item.copy} iconOnly className="-my-1" /> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

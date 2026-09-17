"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/cx";
import { Progress } from "./progress";

export type BreakdownRow = {
  key: string;
  label: string;
  value: number;
  /** Rendered left of the label — a country code, an icon, a favicon. */
  badge?: ReactNode;
};

type BreakdownListProps = {
  title: string;
  rows: BreakdownRow[];
  /** Denominator for the percentage. Falls back to the sum of `rows`. */
  total?: number;
  meta?: ReactNode;
  footer?: ReactNode;
  emptyLabel?: string;
  limit?: number;
  className?: string;
};

const numberFormat = new Intl.NumberFormat("en-US");

export function BreakdownList({
  title,
  rows,
  total,
  meta,
  footer,
  emptyLabel,
  limit,
  className,
}: BreakdownListProps) {
  const t = useTranslations("common");
  const resolvedEmpty = emptyLabel ?? t("noDataInRange");
  const visible = limit ? rows.slice(0, limit) : rows;
  const sum = total ?? rows.reduce((acc, row) => acc + row.value, 0);
  // Bars are scaled against the largest row, not the total, or a long tail is invisible.
  const peak = visible.reduce((acc, row) => Math.max(acc, row.value), 0);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-default border border-border bg-surface p-5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">{title}</span>
        {meta ?? (
          <span className="font-mono text-xs text-fg-disabled">{numberFormat.format(sum)}</span>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="py-4 text-sm text-fg-muted">{resolvedEmpty}</p>
      ) : (
        <div className="flex flex-col gap-3.5">
          {visible.map((row) => (
            <div key={row.key} className="flex items-center gap-3">
              {row.badge ? (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-default border border-border bg-surface font-mono text-xs text-ink">
                  {row.badge}
                </span>
              ) : null}
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex items-center justify-between gap-2.5 text-sm">
                  <span className="truncate">{row.label}</span>
                  <span className="shrink-0 font-mono text-fg-muted">
                    {numberFormat.format(row.value)}
                    {sum > 0 ? (
                      <span className="text-fg-disabled">
                        {" · "}
                        {Math.round((row.value / sum) * 100)}%
                      </span>
                    ) : null}
                  </span>
                </span>
                <Progress value={row.value} max={peak || 1} className="h-1.5" />
              </span>
            </div>
          ))}
        </div>
      )}

      {footer ? (
        <div className="flex items-center gap-2.5 border-t border-border-subtle pt-3.5 text-sm text-fg-muted">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

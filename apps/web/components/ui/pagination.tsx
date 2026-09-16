"use client";

import { Icon } from "@/components/kit/icon";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cx";

const numberFormat = new Intl.NumberFormat("en-US");

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /**
   * Noun for the collection, e.g. "links". Turns a bare "1–25 / 240" into a
   * sentence a first-time user can read.
   */
  itemLabel?: string;
  /** Blocks both arrows while a page transition is in flight. */
  pending?: boolean;
  className?: string;
};

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  itemLabel,
  pending = false,
  className,
}: PaginationProps) {
  const t = useTranslations("common");
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) {
    return null;
  }

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label={t("pagination")}
      className={cn("flex flex-wrap items-center justify-between gap-4", className)}
    >
      <p className="m-0 text-xs text-fg-subtle">
        <span className="numeric font-mono text-fg-muted">
          {numberFormat.format(first)}–{numberFormat.format(last)}
        </span>{" "}
        {t("of")} <span className="numeric font-mono text-fg-muted">{numberFormat.format(total)}</span>
        {itemLabel ? ` ${itemLabel}` : null}
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          icon
          aria-label={t("previousPage")}
          disabled={page <= 1 || pending}
          onClick={() => onPageChange(page - 1)}
        >
          <Icon name="chevron-left" className="text-sm" />
        </Button>
        {/* Live so a screen reader hears the new position after the arrows move. */}
        <span className="numeric font-mono text-xs text-fg-muted" aria-live="polite">
          {page} / {pageCount}
        </span>
        <Button
          size="sm"
          icon
          aria-label={t("nextPage")}
          disabled={page >= pageCount || pending}
          onClick={() => onPageChange(page + 1)}
        >
          <Icon name="chevron-right" className="text-sm" />
        </Button>
      </div>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/kit/icon";
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cx";
import { DomainStatusBadge } from "./domain-status-badge";
import { DOMAIN_STATE_KEYS, domainState, type DomainRowView } from "./types";

type DomainsListProps = {
  rows: DomainRowView[];
  canManage: boolean;
};

export function DomainsList({ rows, canManage }: DomainsListProps) {
  const t = useTranslations("domains");
  const router = useRouter();

  return (
    <Table label={t("title")}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>{t("colDomain")}</TableHeaderCell>
          <TableHeaderCell>{t("status")}</TableHeaderCell>
          <TableHeaderCell className="hidden md:table-cell">{t("colNext")}</TableHeaderCell>
          <TableHeaderCell numeric className="hidden sm:table-cell">
            {t("links")}
          </TableHeaderCell>
          <TableHeaderCell className="w-px">
            <span className="sr-only">{t("actions")}</span>
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => {
          const state = domainState(row);
          const href = `/domains/${row.id}`;
          const needsSetup = state !== "live";
          return (
            <TableRow key={row.id} interactive onClick={() => router.push(href)}>
              <TableCell>
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "hidden size-8 shrink-0 items-center justify-center rounded-default sm:flex",
                      state === "live" ? "bg-success-surface text-success" : "bg-surface text-fg-muted",
                    )}
                    aria-hidden="true"
                  >
                    <Icon name="globe" className="text-xs" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex min-w-0 items-center gap-2">
                      <Link
                        href={href}
                        className="truncate font-medium text-ink no-underline hover:text-accent-ink hover:no-underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {row.hostname}
                      </Link>
                      {row.isDefault ? (
                        <Badge tone="accent" size="sm">
                          {t("default")}
                        </Badge>
                      ) : null}
                    </span>
                    {/* The "what's next" column is hidden on small screens; say it here instead. */}
                    <span className="truncate text-xs text-fg-subtle md:hidden">
                      {t(DOMAIN_STATE_KEYS[state].next)}
                    </span>
                  </span>
                </span>
              </TableCell>
              <TableCell>
                <DomainStatusBadge state={state} />
              </TableCell>
              <TableCell className="hidden text-[13px] text-fg-muted md:table-cell">
                {t(DOMAIN_STATE_KEYS[state].next)}
              </TableCell>
              <TableCell numeric className="hidden text-fg-muted sm:table-cell">
                {formatNumber(row.linkCount)}
              </TableCell>
              <TableCell align="right">
                <Button
                  size="sm"
                  variant={needsSetup && canManage ? "secondary" : "ghost"}
                  trailingIcon="chevron-right"
                  href={href}
                  className="whitespace-nowrap"
                >
                  {needsSetup && canManage ? t("continueSetup") : t("manage")}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

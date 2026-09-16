"use client";

import { Icon } from "@/components/kit/icon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Badge,
  Button,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { listStatus, type DomainRowView } from "./types";

type DomainsListProps = {
  rows: DomainRowView[];
};

export function DomainsList({ rows }: DomainsListProps) {
  const t = useTranslations("domains");
  const router = useRouter();

  if (rows.length === 0) {
    return (
      <EmptyState
        tone="first-run"
        icon={<Icon name="globe" className="text-lg" />}
        title={t("emptyTitle")}
        description={t("emptyDesc")}
        actions={
          <Button variant="primary" href="/domains/new">
            <Icon name="plus" className="text-sm" />
            {t("add")}
          </Button>
        }
      />
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>{t("hostname")}</TableHeaderCell>
          <TableHeaderCell>{t("status")}</TableHeaderCell>
          <TableHeaderCell className="hidden sm:table-cell">{t("links")}</TableHeaderCell>
          <TableHeaderCell className="w-24 text-right">{t("open")}</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => {
          const verified = listStatus(row) === "verified";
          return (
            <TableRow key={row.id} interactive onClick={() => router.push(`/domains/${row.id}`)}>
              <TableCell>
                <Link href={`/domains/${row.id}`} className="flex min-w-0 items-center gap-2 font-medium">
                  <span className="truncate">{row.hostname}</span>
                  {row.isPlatform ? (
                    <Badge tone="muted" className="shrink-0">
                      {t("platform")}
                    </Badge>
                  ) : null}
                  {row.isDefault ? (
                    <Badge tone="accent" className="shrink-0">
                      {t("default")}
                    </Badge>
                  ) : null}
                </Link>
              </TableCell>
              <TableCell>
                <Badge tone={verified ? "accent" : "warn"}>{verified ? t("verified") : t("pending")}</Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell">{row.linkCount}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" href={`/domains/${row.id}`}>
                  {t("open")}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

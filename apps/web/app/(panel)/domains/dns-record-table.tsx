"use client";

import { useTranslations } from "next-intl";
import type { DnsRecordCheck } from "@/lib/dns-probe";
import {
  Badge,
  CopyButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";

function dnsTone(status: DnsRecordCheck["status"] | undefined): "accent" | "warn" | "danger" | "muted" {
  if (status === "ok") {
    return "accent";
  }
  if (status === "mismatch") {
    return "danger";
  }
  if (status === "waiting") {
    return "warn";
  }
  return "muted";
}

type DnsRecordTableProps = {
  title: string;
  rows: { type: string; name: string; value: string; check?: DnsRecordCheck }[];
};

export function DnsRecordTable({ title, rows }: DnsRecordTableProps) {
  const t = useTranslations("domains");
  const tc = useTranslations("common");

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <span className="text-sm font-medium">{title}</span>
      <Table density="compact">
        <TableHead>
          <TableRow>
            <TableHeaderCell>{t("dnsType")}</TableHeaderCell>
            <TableHeaderCell>{t("dnsName")}</TableHeaderCell>
            <TableHeaderCell>{t("dnsContent")}</TableHeaderCell>
            <TableHeaderCell>{t("dnsStatus")}</TableHeaderCell>
            <TableHeaderCell className="text-right">{tc("copy")}</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => {
            const label =
              row.check?.status === "ok"
                ? t("dnsRecordOk")
                : row.check?.status === "mismatch"
                  ? t("dnsRecordMismatch", { found: row.check.found[0] ?? "—" })
                  : t("dnsRecordWaiting");

            return (
              <TableRow key={`${row.type}-${row.name}-${row.value}-${index}`}>
                <TableCell>
                  <Badge tone="muted">{row.type}</Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{row.name}</TableCell>
                <TableCell className="max-w-xs truncate font-mono text-sm text-accent-ink">{row.value}</TableCell>
                <TableCell>
                  <Badge tone={dnsTone(row.check?.status)} dot>
                    {label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <CopyButton value={row.value} label={tc("copy")} size="md" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

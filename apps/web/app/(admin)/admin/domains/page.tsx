import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { QueryFilterBar } from "@/components/shell/query-filter-bar";
import { QueryPagination } from "@/components/shell/query-pagination";
import { PanelShell } from "@/components/shell/panel-shell";
import { StatusBadge } from "@/components/shell/status-badge";
import {
  Badge,
  EmptyState,
  Grid,
  Hero,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type FilterOption,
} from "@/components/ui";
import { ADMIN_PAGE_SIZE, getPlatformCounts, listAllDomains } from "@/lib/admin";
import { formatDateTime, formatNumber } from "@/lib/format";
import { requireSuperadmin } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.domains");
  return { title: t("metaTitle") };
}

type SearchParams = Promise<{ status?: string; page?: string }>;

export default async function AdminDomainsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireSuperadmin();
  const { status, page } = await searchParams;
  const t = await getTranslations("admin.domains");
  const tNav = await getTranslations("admin.nav");
  const tn = await getTranslations("nav");

  const statusOptions: readonly FilterOption[] = [
    { id: "all", label: tNav("all") },
    { id: "active", label: t("filterActive") },
    { id: "provisioning", label: t("filterProvisioning") },
    { id: "pending", label: t("filterPending") },
    { id: "error", label: t("filterError") },
  ];

  const current = Math.max(1, Number(page ?? 1) || 1);
  const statusValue = statusOptions.some((option) => option.id === status) ? status : "all";

  const [{ items, total }, counts] = await Promise.all([
    listAllDomains({ status: statusValue, page: current }),
    getPlatformCounts(),
  ]);

  return (
    <PanelShell
      title={tn("admin-domains")}
      crumbs={[{ label: tNav("admin") }, { label: tn("admin-domains") }]}
    >
      <Hero
        eyebrow={t("hostnames", { count: formatNumber(total) })}
        title={t("title")}
        description={t("description")}
      />

      <Grid columns={3}>
        <Card label={t("customDomains")} value={formatNumber(counts.customDomains)} staticHover />
        <Card
          label={t("awaitingDns")}
          value={formatNumber(counts.pendingDomains)}
          delta={counts.pendingDomains > 0 ? t("customerAction") : t("allClear")}
          staticHover
        />
        <Card label={tn("admin-workspaces")} value={formatNumber(counts.workspaces)} staticHover />
      </Grid>

      <QueryFilterBar options={statusOptions} value={statusValue} searchable={false} />

      {items.length === 0 ? (
        <EmptyState
          icon={<Icon name="globe" className="text-lg" />}
          eyebrow={tn("admin-domains")}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
        />
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{tNav("hostname")}</TableHeaderCell>
                <TableHeaderCell>{tNav("workspace")}</TableHeaderCell>
                <TableHeaderCell>{tNav("status")}</TableHeaderCell>
                <TableHeaderCell>{tNav("ssl")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{tn("links")}</TableHeaderCell>
                <TableHeaderCell>{t("lastCheck")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm">{row.hostname}</span>
                      {row.isPlatform ? <Badge tone="muted">{t("platform")}</Badge> : null}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-fg-muted">{row.workspaceName}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.isPlatform ? "active" : row.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-fg-muted">
                    {row.isPlatform ? t("sslManaged") : row.sslStatus}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(row.linkCount)}
                  </TableCell>
                  <TableCell className="text-sm text-fg-muted">
                    {row.lastCheckedAt ? formatDateTime(row.lastCheckedAt) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <QueryPagination page={current} pageSize={ADMIN_PAGE_SIZE} total={total} />
        </>
      )}
    </PanelShell>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { QueryFilterBar } from "@/components/shell/query-filter-bar";
import { QueryPagination } from "@/components/shell/query-pagination";
import { PanelShell } from "@/components/shell/panel-shell";
import {
  Badge,
  Button,
  EmptyState,
  Grid,
  PageHeader,
  StatCard,
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
import { DomainStatusBadge } from "@/app/(panel)/domains/domain-status-badge";
import { domainState } from "@/app/(panel)/domains/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.domains");
  return { title: t("metaTitle") };
}

type SearchParams = Promise<{ status?: string; page?: string }>;

export default async function AdminDomainsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireSuperadmin();
  const { status, page } = await searchParams;
  const [t, tNav, tn] = await Promise.all([
    getTranslations("admin.domains"),
    getTranslations("admin.nav"),
    getTranslations("nav"),
  ]);

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
    <PanelShell title={t("title")} crumbs={[{ label: tNav("admin"), href: "/admin" }]}>
      <PageHeader
        title={t("title")}
        meta={<Badge tone="neutral">{t("hostnames", { count: formatNumber(total) })}</Badge>}
        description={t("description")}
      />

      <Grid columns={3}>
        <StatCard
          icon="globe"
          label={t("customDomains")}
          info={t("customDomainsInfo")}
          value={formatNumber(counts.customDomains)}
        />
        <StatCard
          icon="clock"
          label={t("awaitingDns")}
          info={t("awaitingDnsInfo")}
          value={formatNumber(counts.pendingDomains)}
          deltaLabel={counts.pendingDomains > 0 ? t("customerAction") : t("allClear")}
          href={counts.pendingDomains > 0 ? "/admin/domains?status=pending" : undefined}
        />
        <StatCard
          icon="building"
          label={tn("admin-workspaces")}
          value={formatNumber(counts.workspaces)}
          href="/admin/workspaces"
        />
      </Grid>

      <QueryFilterBar options={statusOptions} value={statusValue} searchable={false} />

      {items.length === 0 ? (
        <EmptyState
          icon="globe"
          title={t("emptyTitle")}
          description={t("emptyDesc")}
          actions={
            statusValue !== "all" ? (
              <Button href="/admin/domains" leadingIcon="xmark">
                {tNav("clearFilters")}
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <Table label={t("title")}>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{tNav("hostname")}</TableHeaderCell>
                <TableHeaderCell>{tNav("status")}</TableHeaderCell>
                <TableHeaderCell className="hidden md:table-cell">{tNav("ssl")}</TableHeaderCell>
                <TableHeaderCell numeric className="hidden sm:table-cell">
                  {tn("links")}
                </TableHeaderCell>
                <TableHeaderCell className="hidden lg:table-cell">{t("lastCheck")}</TableHeaderCell>
                <TableHeaderCell className="w-px">
                  <span className="sr-only">{tNav("actions")}</span>
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate font-mono text-[13px] text-ink">{row.hostname}</span>
                        {row.isPlatform ? (
                          <Badge tone="neutral" size="sm">
                            {t("platform")}
                          </Badge>
                        ) : null}
                      </span>
                      <span className="truncate text-xs text-fg-muted">{row.workspaceName}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <DomainStatusBadge state={domainState(row)} />
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-fg-muted md:table-cell">
                    {row.isPlatform ? t("sslManaged") : row.sslStatus}
                  </TableCell>
                  <TableCell numeric className="hidden sm:table-cell">
                    {formatNumber(row.linkCount)}
                  </TableCell>
                  <TableCell className="numeric hidden text-[13px] whitespace-nowrap text-fg-muted lg:table-cell">
                    {row.lastCheckedAt ? formatDateTime(row.lastCheckedAt) : "—"}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="sm"
                      variant="ghost"
                      trailingIcon="chevron-right"
                      href={`/admin/links?workspace=${encodeURIComponent(row.workspaceId)}&q=${encodeURIComponent(row.hostname)}`}
                    >
                      {t("viewLinks")}
                    </Button>
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

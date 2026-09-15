import type { Metadata } from "next";
import { Globe } from "lucide-react";
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

export const metadata: Metadata = { title: "Domains · Admin" };

const STATUS_OPTIONS: readonly FilterOption[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "provisioning", label: "Provisioning" },
  { id: "pending", label: "Pending DNS" },
  { id: "error", label: "Error" },
];

type SearchParams = Promise<{ status?: string; page?: string }>;

export default async function AdminDomainsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireSuperadmin();
  const { status, page } = await searchParams;

  const current = Math.max(1, Number(page ?? 1) || 1);
  const statusValue = STATUS_OPTIONS.some((option) => option.id === status) ? status : "all";

  const [{ items, total }, counts] = await Promise.all([
    listAllDomains({ status: statusValue, page: current }),
    getPlatformCounts(),
  ]);

  return (
    <PanelShell title="Domains" crumbs={[{ label: "Admin" }, { label: "Domains" }]}>
      <Hero
        eyebrow={`${formatNumber(total)} hostnames`}
        title="Custom hostname health"
        description="Every customer hostname registered with Cloudflare for SaaS, with its DNS and certificate state."
      />

      <Grid columns={3}>
        <Card label="Custom domains" value={formatNumber(counts.customDomains)} staticHover />
        <Card
          label="Awaiting DNS"
          value={formatNumber(counts.pendingDomains)}
          delta={counts.pendingDomains > 0 ? "Customer action required" : "All clear"}
          staticHover
        />
        <Card label="Workspaces" value={formatNumber(counts.workspaces)} staticHover />
      </Grid>

      <QueryFilterBar options={STATUS_OPTIONS} value={statusValue} searchable={false} />

      {items.length === 0 ? (
        <EmptyState
          icon={<Globe className="size-5" />}
          eyebrow="Domains"
          title="No domains match"
          description="Change the status filter to see more hostnames."
        />
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Hostname</TableHeaderCell>
                <TableHeaderCell>Workspace</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>SSL</TableHeaderCell>
                <TableHeaderCell className="text-right">Links</TableHeaderCell>
                <TableHeaderCell>Last check</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm">{row.hostname}</span>
                      {row.isPlatform ? <Badge tone="muted">Platform</Badge> : null}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-fg-muted">{row.workspaceName}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.isPlatform ? "active" : row.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-fg-muted">
                    {row.isPlatform ? "managed" : row.sslStatus}
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

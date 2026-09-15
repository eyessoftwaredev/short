import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { PLAN_KEYS } from "@short/core";
import { QueryFilterBar } from "@/components/shell/query-filter-bar";
import { QueryPagination } from "@/components/shell/query-pagination";
import { PanelShell } from "@/components/shell/panel-shell";
import { StatusBadge } from "@/components/shell/status-badge";
import {
  Badge,
  Button,
  EmptyState,
  Hero,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type FilterOption,
} from "@/components/ui";
import { ADMIN_PAGE_SIZE, listWorkspaces } from "@/lib/admin";
import { formatDate, formatNumber } from "@/lib/format";
import { requireSuperadmin } from "@/lib/session";

export const metadata: Metadata = { title: "Workspaces · Admin" };

const PLAN_OPTIONS: readonly FilterOption[] = [
  { id: "all", label: "All plans" },
  ...PLAN_KEYS.map((key) => ({ id: key, label: key[0]!.toUpperCase() + key.slice(1) })),
];

type SearchParams = Promise<{ q?: string; plan?: string; page?: string }>;

export default async function AdminWorkspacesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireSuperadmin();
  const { q, plan, page } = await searchParams;

  const current = Math.max(1, Number(page ?? 1) || 1);
  const planValue = PLAN_OPTIONS.some((option) => option.id === plan) ? plan : "all";

  const { items, total } = await listWorkspaces({
    search: q,
    planKey: planValue,
    page: current,
  });

  return (
    <PanelShell title="Workspaces" crumbs={[{ label: "Admin" }, { label: "Workspaces" }]}>
      <Hero
        eyebrow={`${formatNumber(total)} workspaces`}
        title="Workspaces"
        description="Every tenant on the platform with its plan, team size and link volume."
      />

      <QueryFilterBar
        paramKey="plan"
        options={PLAN_OPTIONS}
        value={planValue}
        searchValue={q ?? ""}
        searchPlaceholder="Search name or slug"
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-5" />}
          eyebrow="Workspaces"
          title="No workspaces match"
          description="Try a different plan filter or search term."
        />
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Workspace</TableHeaderCell>
                <TableHeaderCell>Plan</TableHeaderCell>
                <TableHeaderCell className="text-right">Members</TableHeaderCell>
                <TableHeaderCell className="text-right">Links</TableHeaderCell>
                <TableHeaderCell>Created</TableHeaderCell>
                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{row.name}</span>
                      <span className="truncate font-mono text-xs text-fg-muted">
                        {row.ownerEmail ?? row.slug}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge tone={row.planKey === "free" ? "muted" : "accent"}>
                        {row.planName}
                      </Badge>
                      {row.status === "active" ? null : <StatusBadge status={row.status} />}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(row.members)}
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(row.links)}</TableCell>
                  <TableCell className="text-sm text-fg-muted">
                    {formatDate(row.createdAt)}
                  </TableCell>
                  <TableCell>
                    <span className="flex justify-end">
                      <Button size="sm" variant="ghost" href={`/admin/links?workspace=${row.id}`}>
                        Inspect
                      </Button>
                    </span>
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

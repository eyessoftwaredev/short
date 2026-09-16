import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.workspaces");
  return { title: t("metaTitle") };
}

type SearchParams = Promise<{ q?: string; plan?: string; page?: string }>;

export default async function AdminWorkspacesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireSuperadmin();
  const { q, plan, page } = await searchParams;
  const t = await getTranslations("admin.workspaces");
  const tNav = await getTranslations("admin.nav");
  const tn = await getTranslations("nav");
  const tc = await getTranslations("common");

  const planOptions: readonly FilterOption[] = [
    { id: "all", label: t("allPlans") },
    ...PLAN_KEYS.map((key) => ({ id: key, label: key[0]!.toUpperCase() + key.slice(1) })),
  ];

  const current = Math.max(1, Number(page ?? 1) || 1);
  const planValue = planOptions.some((option) => option.id === plan) ? plan : "all";

  const { items, total } = await listWorkspaces({
    search: q,
    planKey: planValue,
    page: current,
  });

  return (
    <PanelShell
      title={tn("admin-workspaces")}
      crumbs={[{ label: tNav("admin") }, { label: tn("admin-workspaces") }]}
    >
      <Hero
        eyebrow={t("count", { count: formatNumber(total) })}
        title={tn("admin-workspaces")}
        description={t("description")}
      />

      <QueryFilterBar
        paramKey="plan"
        options={planOptions}
        value={planValue}
        searchValue={q ?? ""}
        searchPlaceholder={t("searchPlaceholder")}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<Icon name="building" className="text-lg" />}
          eyebrow={tn("admin-workspaces")}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
        />
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{tNav("workspace")}</TableHeaderCell>
                <TableHeaderCell>{tNav("plan")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{tNav("members")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{tn("links")}</TableHeaderCell>
                <TableHeaderCell>{tNav("created")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{tNav("actions")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="flex min-w-0 flex-col">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-medium">{row.name}</span>
                        <Badge tone="muted">
                          {row.kind === "team" ? tc("team") : tc("personal")}
                        </Badge>
                      </span>
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
                        {tNav("inspect")}
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

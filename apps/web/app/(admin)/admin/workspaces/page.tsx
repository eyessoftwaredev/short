import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PLAN_KEYS, getPlan } from "@short/core";
import { Icon } from "@/components/kit/icon";
import { QueryFilterBar } from "@/components/shell/query-filter-bar";
import { QueryPagination } from "@/components/shell/query-pagination";
import { PanelShell } from "@/components/shell/panel-shell";
import { StatusBadge } from "@/components/shell/status-badge";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  PageHeader,
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
  const locale = await getLocale();
  await requireSuperadmin();
  const { q, plan, page } = await searchParams;
  const [t, tNav, tn, tc] = await Promise.all([
    getTranslations("admin.workspaces"),
    getTranslations("admin.nav"),
    getTranslations("nav"),
    getTranslations("common"),
  ]);

  const planOptions: readonly FilterOption[] = [
    { id: "all", label: t("allPlans") },
    ...PLAN_KEYS.map((key) => ({ id: key, label: getPlan(key).name })),
  ];

  const current = Math.max(1, Number(page ?? 1) || 1);
  const planValue = planOptions.some((option) => option.id === plan) ? plan : "all";
  const filtered = planValue !== "all" || Boolean(q?.trim());

  const { items, total } = await listWorkspaces({
    search: q,
    planKey: planValue,
    page: current,
  });

  return (
    <PanelShell
      title={tn("admin-workspaces")}
      crumbs={[{ label: tNav("admin"), href: "/admin" }]}
      searchable={false}
    >
      <PageHeader
        title={tn("admin-workspaces")}
        meta={<Badge tone="neutral">{t("count", { count: formatNumber(total, locale) })}</Badge>}
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
          icon="building"
          title={t("emptyTitle")}
          description={t("emptyDesc")}
          actions={
            filtered ? (
              <Button href="/admin/workspaces" leadingIcon="xmark">
                {tNav("clearFilters")}
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <Table label={tn("admin-workspaces")}>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{tNav("workspace")}</TableHeaderCell>
                <TableHeaderCell>{tNav("plan")}</TableHeaderCell>
                <TableHeaderCell numeric className="hidden sm:table-cell">
                  {tNav("members")}
                </TableHeaderCell>
                <TableHeaderCell numeric className="hidden sm:table-cell">
                  {tn("links")}
                </TableHeaderCell>
                <TableHeaderCell className="hidden md:table-cell">{tNav("created")}</TableHeaderCell>
                <TableHeaderCell className="w-px">
                  <span className="sr-only">{tNav("actions")}</span>
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar size="md" shape="square" tone={row.kind === "team" ? "accent" : "neutral"}>
                        {(row.name.trim()[0] ?? "?").toUpperCase()}
                      </Avatar>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-medium">{row.name}</span>
                          <Badge tone="neutral" size="sm">
                            {row.kind === "team" ? tc("team") : tc("personal")}
                          </Badge>
                        </span>
                        <span className="truncate font-mono text-xs text-fg-muted">
                          {row.ownerEmail ?? row.slug}
                        </span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={row.planKey === "free" ? "neutral" : "accent"}>{row.planName}</Badge>
                      {row.status === "active" ? null : <StatusBadge status={row.status} />}
                    </span>
                  </TableCell>
                  <TableCell numeric className="hidden sm:table-cell">
                    {formatNumber(row.members, locale)}
                  </TableCell>
                  <TableCell numeric className="hidden sm:table-cell">
                    {formatNumber(row.links, locale)}
                  </TableCell>
                  <TableCell className="numeric hidden text-[13px] whitespace-nowrap text-fg-muted md:table-cell">
                    {formatDate(row.createdAt, locale)}
                  </TableCell>
                  <TableCell align="right">
                    <span className="flex justify-end gap-1">
                      {row.ownerEmail ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          href={`/admin/users?q=${encodeURIComponent(row.ownerEmail)}`}
                          aria-label={t("findOwner", { email: row.ownerEmail })}
                          title={t("findOwner", { email: row.ownerEmail })}
                          icon
                        >
                          <Icon name="user-gear" className="text-xs" />
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        trailingIcon="chevron-right"
                        href={`/admin/links?workspace=${encodeURIComponent(row.id)}`}
                      >
                        {t("viewLinks")}
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

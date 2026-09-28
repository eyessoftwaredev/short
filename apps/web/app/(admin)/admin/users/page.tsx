import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { QueryFilterBar } from "@/components/shell/query-filter-bar";
import { QueryPagination } from "@/components/shell/query-pagination";
import { PanelShell } from "@/components/shell/panel-shell";
import { Badge, Button, EmptyState, PageHeader, type FilterOption } from "@/components/ui";
import { ADMIN_PAGE_SIZE, listUsers } from "@/lib/admin";
import { formatNumber } from "@/lib/format";
import { requireSuperadmin } from "@/lib/session";
import { UsersTable, type AdminUserView } from "./users-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.users");
  return { title: t("metaTitle") };
}

type SearchParams = Promise<{ q?: string; status?: string; page?: string }>;

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const context = await requireSuperadmin();
  const { q, status, page } = await searchParams;
  const [t, tNav, tn] = await Promise.all([
    getTranslations("admin.users"),
    getTranslations("admin.nav"),
    getTranslations("nav"),
  ]);

  const statusOptions: readonly FilterOption[] = [
    { id: "all", label: tNav("all") },
    { id: "banned", label: t("filterBanned") },
    { id: "unverified", label: t("filterUnverified") },
    { id: "superadmin", label: t("filterSuperadmin") },
  ];

  const current = Math.max(1, Number(page ?? 1) || 1);
  const statusValue = statusOptions.some((option) => option.id === status) ? status : "all";
  const filtered = statusValue !== "all" || Boolean(q?.trim());

  const { items, total } = await listUsers({
    search: q,
    status: statusValue as "all" | "banned" | "unverified" | "superadmin",
    page: current,
  });

  const rows: AdminUserView[] = items.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    banned: row.banned,
    banReason: row.banReason,
    emailVerified: row.emailVerified,
    createdAt: row.createdAt.toISOString(),
    workspaces: row.workspaces,
  }));

  return (
    <PanelShell
      title={tn("admin-users")}
      crumbs={[{ label: tNav("admin"), href: "/admin" }]}
      searchable={false}
    >
      <PageHeader
        title={tn("admin-users")}
        meta={<Badge tone="neutral">{t("accounts", { count: formatNumber(total) })}</Badge>}
        description={t("description")}
      />

      <QueryFilterBar
        options={statusOptions}
        value={statusValue}
        searchValue={q ?? ""}
        searchPlaceholder={t("searchPlaceholder")}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon="users"
          title={filtered ? t("emptyTitle") : t("noUsersTitle")}
          description={filtered ? t("emptyDesc") : t("noUsersDesc")}
          actions={
            filtered ? (
              <Button href="/admin/users" leadingIcon="xmark">
                {tNav("clearFilters")}
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <UsersTable rows={rows} currentUserId={context.user.id} />
          <QueryPagination page={current} pageSize={ADMIN_PAGE_SIZE} total={total} />
        </>
      )}
    </PanelShell>
  );
}

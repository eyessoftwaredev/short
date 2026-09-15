import type { Metadata } from "next";
import { Users } from "lucide-react";
import { QueryFilterBar } from "@/components/shell/query-filter-bar";
import { QueryPagination } from "@/components/shell/query-pagination";
import { PanelShell } from "@/components/shell/panel-shell";
import { EmptyState, Hero, type FilterOption } from "@/components/ui";
import { ADMIN_PAGE_SIZE, listUsers } from "@/lib/admin";
import { formatNumber } from "@/lib/format";
import { requireSuperadmin } from "@/lib/session";
import { UsersTable, type AdminUserView } from "./users-table";

export const metadata: Metadata = { title: "Users · Admin" };

const STATUS_OPTIONS: readonly FilterOption[] = [
  { id: "all", label: "All" },
  { id: "banned", label: "Banned" },
  { id: "unverified", label: "Unverified" },
  { id: "superadmin", label: "Platform admins" },
];

type SearchParams = Promise<{ q?: string; status?: string; page?: string }>;

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const context = await requireSuperadmin();
  const { q, status, page } = await searchParams;

  const current = Math.max(1, Number(page ?? 1) || 1);
  const statusValue = STATUS_OPTIONS.some((option) => option.id === status) ? status : "all";

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
    <PanelShell title="Users" crumbs={[{ label: "Admin" }, { label: "Users" }]}>
      <Hero
        eyebrow={`${formatNumber(total)} accounts`}
        title="Users"
        description="Ban abusive accounts, grant platform access, or sign in as a user to reproduce a support ticket."
      />

      <QueryFilterBar
        options={STATUS_OPTIONS}
        value={statusValue}
        searchValue={q ?? ""}
        searchPlaceholder="Search name or email"
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5" />}
          eyebrow="Users"
          title="No accounts match"
          description="Adjust the filters or search for a different email."
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

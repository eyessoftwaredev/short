import type { Metadata } from "next";
import { Link2 } from "lucide-react";
import { QueryFilterBar } from "@/components/shell/query-filter-bar";
import { QueryPagination } from "@/components/shell/query-pagination";
import { PanelShell } from "@/components/shell/panel-shell";
import { EmptyState, Hero, type FilterOption } from "@/components/ui";
import { ADMIN_PAGE_SIZE, searchLinks } from "@/lib/admin";
import { formatNumber } from "@/lib/format";
import { requireSuperadmin } from "@/lib/session";
import { LinksModeration, type AdminLinkView } from "./links-moderation";

export const metadata: Metadata = { title: "All links · Admin" };

const STATUS_OPTIONS: readonly FilterOption[] = [
  { id: "all", label: "All" },
  { id: "flagged", label: "Flagged" },
  { id: "disabled", label: "Disabled" },
];

type SearchParams = Promise<{
  q?: string;
  status?: string;
  workspace?: string;
  page?: string;
}>;

export default async function AdminLinksPage({ searchParams }: { searchParams: SearchParams }) {
  await requireSuperadmin();
  const { q, status, workspace, page } = await searchParams;

  const current = Math.max(1, Number(page ?? 1) || 1);
  const statusValue = STATUS_OPTIONS.some((option) => option.id === status) ? status : "all";

  const { items, total } = await searchLinks({
    search: q,
    status: statusValue as "all" | "flagged" | "disabled",
    workspaceId: workspace,
    page: current,
  });

  const rows: AdminLinkView[] = items.map((row) => ({
    id: row.id,
    slug: row.slug,
    hostname: row.hostname,
    destination: row.destination,
    workspaceName: row.workspaceName,
    createdAt: row.createdAt.toISOString(),
    flagged: row.abuseFlaggedAt !== null,
    abuseReason: row.abuseReason,
    disabled: row.disabledAt !== null,
  }));

  return (
    <PanelShell title="All links" crumbs={[{ label: "Admin" }, { label: "Links" }]}>
      <Hero
        eyebrow={`${formatNumber(total)} links`}
        title="Global link search"
        description="Search across every workspace by slug, hostname or destination. Flagging a link disables it at the edge within seconds."
      />

      <QueryFilterBar
        options={STATUS_OPTIONS}
        value={statusValue}
        searchValue={q ?? ""}
        searchPlaceholder="Search slug, hostname or destination"
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Link2 className="size-5" />}
          eyebrow="Links"
          title="No links match"
          description="Search by slug, destination URL or hostname."
        />
      ) : (
        <>
          <LinksModeration rows={rows} />
          <QueryPagination page={current} pageSize={ADMIN_PAGE_SIZE} total={total} />
        </>
      )}
    </PanelShell>
  );
}

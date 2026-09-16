import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { QueryFilterBar } from "@/components/shell/query-filter-bar";
import { QueryPagination } from "@/components/shell/query-pagination";
import { PanelShell } from "@/components/shell/panel-shell";
import { EmptyState, Hero, type FilterOption } from "@/components/ui";
import { ADMIN_PAGE_SIZE, searchLinks } from "@/lib/admin";
import { formatNumber } from "@/lib/format";
import { requireSuperadmin } from "@/lib/session";
import { LinksModeration, type AdminLinkView } from "./links-moderation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.links");
  return { title: t("metaTitle") };
}

type SearchParams = Promise<{
  q?: string;
  status?: string;
  workspace?: string;
  page?: string;
}>;

export default async function AdminLinksPage({ searchParams }: { searchParams: SearchParams }) {
  await requireSuperadmin();
  const { q, status, workspace, page } = await searchParams;
  const t = await getTranslations("admin.links");
  const tNav = await getTranslations("admin.nav");
  const tn = await getTranslations("nav");

  const statusOptions: readonly FilterOption[] = [
    { id: "all", label: tNav("all") },
    { id: "flagged", label: t("filterFlagged") },
    { id: "disabled", label: t("filterDisabled") },
  ];

  const current = Math.max(1, Number(page ?? 1) || 1);
  const statusValue = statusOptions.some((option) => option.id === status) ? status : "all";

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
    <PanelShell
      title={tn("admin-links")}
      crumbs={[{ label: tNav("admin") }, { label: tn("links") }]}
    >
      <Hero
        eyebrow={t("count", { count: formatNumber(total) })}
        title={t("title")}
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
          icon={<Icon name="link" className="text-lg" />}
          eyebrow={tn("links")}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
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

import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { QueryFilterBar } from "@/components/shell/query-filter-bar";
import { QueryPagination } from "@/components/shell/query-pagination";
import { PanelShell } from "@/components/shell/panel-shell";
import { Badge, Button, Callout, EmptyState, PageHeader, type FilterOption } from "@/components/ui";
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
  const locale = await getLocale();
  await requireSuperadmin();
  const { q, status, workspace, page } = await searchParams;
  const [t, tNav] = await Promise.all([getTranslations("admin.links"), getTranslations("admin.nav")]);

  const statusOptions: readonly FilterOption[] = [
    { id: "all", label: tNav("all") },
    { id: "flagged", label: t("filterFlagged") },
    { id: "disabled", label: t("filterDisabled") },
  ];

  const current = Math.max(1, Number(page ?? 1) || 1);
  const statusValue = statusOptions.some((option) => option.id === status) ? status : "all";
  const workspaceId = workspace?.trim() || undefined;
  const filtered = statusValue !== "all" || Boolean(q?.trim()) || Boolean(workspaceId);

  const { items, total } = await searchLinks({
    search: q,
    status: statusValue as "all" | "flagged" | "disabled",
    workspaceId,
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

  // "View links" on an account lands here with ?workspace=; say so, and offer a way out.
  const withoutWorkspace = new URLSearchParams();
  if (q) {
    withoutWorkspace.set("q", q);
  }
  if (statusValue && statusValue !== "all") {
    withoutWorkspace.set("status", statusValue);
  }
  const clearQuery = withoutWorkspace.toString();
  const clearWorkspaceHref = clearQuery === "" ? "/admin/links" : `/admin/links?${clearQuery}`;

  return (
    <PanelShell title={t("title")} crumbs={[{ label: tNav("admin"), href: "/admin" }]} searchable={false}>
      <PageHeader
        title={t("title")}
        meta={<Badge tone="neutral">{t("count", { count: formatNumber(total, locale) })}</Badge>}
        description={t("description")}
      />

      {workspaceId ? (
        <Callout
          tone="info"
          icon="filter"
          title={
            rows[0]
              ? t("filteredByAccount", { name: rows[0].workspaceName })
              : t("filteredByAccountUnknown")
          }
          actions={
            <Button size="sm" href={clearWorkspaceHref} leadingIcon="xmark">
              {t("showAllLinks")}
            </Button>
          }
        />
      ) : null}

      <QueryFilterBar
        options={statusOptions}
        value={statusValue}
        searchValue={q ?? ""}
        searchPlaceholder={t("searchPlaceholder")}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon="link"
          title={t("emptyTitle")}
          description={t("emptyDesc")}
          actions={
            filtered ? (
              <Button href="/admin/links" leadingIcon="xmark">
                {tNav("clearFilters")}
              </Button>
            ) : null
          }
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

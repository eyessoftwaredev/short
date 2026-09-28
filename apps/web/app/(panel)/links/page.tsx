import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { linkListQuerySchema } from "@short/core";
import { PanelShell } from "@/components/shell/panel-shell";
import { Badge, Button, Callout, PageHeader } from "@/components/ui";
import { loadLinkClickTotals } from "@/lib/analytics";
import { listFolders } from "@/lib/folders";
import { formatNumber } from "@/lib/format";
import { countBrokenLinks, listLinks, listWorkspaceDomains, listWorkspaceTags } from "@/lib/links";
import { canAdministerWorkspace, requireWorkspace } from "@/lib/session";
import { linkStatusOf } from "./link-state";
import { LinksFilters, type LinksFilterState, type StatusFilter } from "./links-filters";
import { LinksTable, type LinkListRow } from "./links-table";
import { LinksToolsMenu } from "./links-csv-bar";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("links") };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LinksPage({ searchParams }: { searchParams: SearchParams }) {
  const [context, raw, tn, t] = await Promise.all([
    requireWorkspace(),
    searchParams,
    getTranslations("nav"),
    getTranslations("links"),
  ]);
  const workspaceId = context.workspace.id;

  const requested = {
    search: single(raw.search),
    status: single(raw.status) ?? "all",
    sort: single(raw.sort) ?? "created_desc",
    page: single(raw.page) ?? 1,
    pageSize: single(raw.pageSize) ?? 25,
    domainId: single(raw.domainId),
    folderId: single(raw.folderId),
    tag: single(raw.tag),
    health: single(raw.health),
    clickLimit: single(raw.clickLimit),
  };
  // A hand-edited or stale URL (bad page, unknown status, deleted folder id) falls back
  // to the defaults instead of throwing the whole screen into the error boundary.
  const parsedQuery = linkListQuerySchema.safeParse(requested);
  const query = parsedQuery.success ? parsedQuery.data : linkListQuerySchema.parse({});

  const [{ items, total }, folderRows, tags, domainRows, brokenCount] = await Promise.all([
    listLinks(workspaceId, query, { strictActive: true }),
    listFolders(workspaceId),
    listWorkspaceTags(workspaceId),
    listWorkspaceDomains(workspaceId),
    countBrokenLinks(workspaceId),
  ]);

  // Lifetime clicks + QR scans from the daily rollup: one cheap query for the page, and
  // the same number the click limit is measured against. `null` = analytics unreachable,
  // which the table shows as "—" rather than a misleading 0.
  const totals = await loadLinkClickTotals(
    workspaceId,
    items.map((link) => link.id),
  );

  const folderNames = new Map(folderRows.map((folder) => [folder.id, folder.name]));
  const now = Date.now();
  const rows: LinkListRow[] = items.map((link) => ({
    id: link.id,
    hostname: link.hostname,
    slug: link.slug,
    destination: link.destination,
    title: link.title,
    tags: link.tags,
    status: linkStatusOf(
      {
        archived: link.archived,
        disabled: link.disabledAt != null,
        limitReached: link.clickLimitReachedAt != null,
        expiresAt: link.expiresAt?.toISOString() ?? null,
        startsAt: link.startsAt?.toISOString() ?? null,
      },
      now,
    ),
    startsAt: link.startsAt?.toISOString() ?? null,
    broken: link.healthStatus === "broken",
    healthStatusCode: link.healthStatusCode,
    hasRules: link.rules.length > 0,
    hasAbTest: link.abVariants.length > 0,
    hasPassword: link.passwordHash != null,
    hasAppLinks: link.iosDestination != null || link.androidDestination != null,
    openMode: link.openMode,
    folderName: link.folderId ? (folderNames.get(link.folderId) ?? null) : null,
    createdAt: link.createdAt.toISOString(),
    clicks: totals ? (totals.get(link.id) ?? 0) : null,
    maxClicks: link.maxClicks,
  }));

  const statusFilter: StatusFilter =
    query.health === "broken" ? "broken" : query.clickLimit === "reached" ? "limit" : query.status;
  const filters: LinksFilterState = {
    search: query.search ?? "",
    status: statusFilter,
    folderId: query.folderId ?? "",
    tag: query.tag ?? "",
    domainId: query.domainId ?? "",
    sort: query.sort === "clicks_desc" ? "created_desc" : query.sort,
  };
  const filtered =
    filters.search !== "" ||
    statusFilter !== "all" ||
    filters.folderId !== "" ||
    filters.tag !== "" ||
    filters.domainId !== "" ||
    query.clickLimit != null ||
    query.health != null;

  const canAdmin = canAdministerWorkspace(context);

  return (
    // The filter bar below owns search on this screen, so the topbar's copy of
    // it is suppressed rather than sitting there doing the same job.
    <PanelShell title={tn("links")} crumbs={[{ label: context.workspace.name }]} searchable={false}>
      <PageHeader
        title={tn("links")}
        meta={<Badge tone="neutral">{formatNumber(total)}</Badge>}
        description={t("list.description")}
        secondaryActions={canAdmin ? <LinksToolsMenu /> : null}
        actions={
          <Button variant="primary" leadingIcon="plus" href="/links/new">
            {t("list.create")}
          </Button>
        }
      />

      {brokenCount > 0 && statusFilter !== "broken" ? (
        <Callout
          tone="warn"
          title={t("list.brokenTitle", { count: brokenCount })}
          actions={
            <Button size="sm" href="/links?health=broken" leadingIcon="pulse">
              {t("list.brokenShow")}
            </Button>
          }
        >
          {t("list.brokenBody")}
        </Callout>
      ) : null}

      <LinksFilters
        value={filters}
        folders={folderRows.map((folder) => ({ id: folder.id, name: folder.name }))}
        tags={tags}
        domains={domainRows.map((domain) => ({ id: domain.id, hostname: domain.hostname }))}
      />

      <LinksTable
        rows={rows}
        total={total}
        page={query.page}
        pageSize={query.pageSize}
        filtered={filtered || query.page > 1}
        canDelete={context.role !== "member" || context.isSuperadmin}
      />
    </PanelShell>
  );
}

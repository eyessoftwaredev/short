import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { linkListQuerySchema } from "@short/core";
import { chQuery, toClickhouseDateTime } from "@short/analytics";
import { PanelShell } from "@/components/shell/panel-shell";
import { Button, Hero } from "@/components/ui";
import { listFolders } from "@/lib/folders";
import { listLinks } from "@/lib/links";
import { hasWorkspaceRole, requireWorkspace } from "@/lib/session";
import { FoldersBar } from "./folders-bar";
import { LinksCsvBar } from "./links-csv-bar";
import { LinksTable, type LinkListRow } from "./links-table";
import { RewriteDestinationsButton } from "./rewrite-destinations-dialog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("links") };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * 90-day click totals for exactly the links on this page. A workspace-wide "top N"
 * query would leave every link outside the top N showing 0.
 */
async function loadPageClickCounts(workspaceId: string, linkIds: string[]): Promise<Map<string, number>> {
  if (linkIds.length === 0) {
    return new Map();
  }
  const to = new Date();
  const from = new Date(to.getTime() - 1000 * 60 * 60 * 24 * 90);
  const rows = await chQuery<{ link_id: string; clicks: string }>(
    `SELECT link_id, count() AS clicks
     FROM events
     WHERE workspace_id = {workspaceId:String}
       AND ts >= {from:DateTime64(3)} AND ts < {to:DateTime64(3)}
       AND is_bot = 0
       AND link_id IN {linkIds:Array(String)}
     GROUP BY link_id`,
    {
      workspaceId,
      from: toClickhouseDateTime(from.toISOString()),
      to: toClickhouseDateTime(to.toISOString()),
      linkIds,
    },
  );
  return new Map(rows.map((row) => [row.link_id, Number(row.clicks)]));
}

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LinksPage({ searchParams }: { searchParams: SearchParams }) {
  const [context, raw, tn, t, tc] = await Promise.all([
    requireWorkspace(),
    searchParams,
    getTranslations("nav"),
    getTranslations("links"),
    getTranslations("common"),
  ]);

  const requested = {
    search: single(raw.search),
    status: single(raw.status) ?? "all",
    sort: single(raw.sort) ?? "created_desc",
    page: single(raw.page) ?? 1,
    pageSize: single(raw.pageSize) ?? 25,
    domainId: single(raw.domainId),
    folderId: single(raw.folderId),
    tag: single(raw.tag),
  };
  // A hand-edited or stale URL (bad page, unknown status, deleted folder id) falls back
  // to the defaults instead of throwing the whole screen into the error boundary.
  const parsedQuery = linkListQuerySchema.safeParse(requested);
  const query = parsedQuery.success ? parsedQuery.data : linkListQuerySchema.parse({});

  const [{ items, total }, folderRows] = await Promise.all([
    listLinks(context.workspace.id, query),
    listFolders(context.workspace.id),
  ]);

  // Click counts live in ClickHouse; one query covers exactly the rows on this page.
  let clicksByLink = new Map<string, number>();
  try {
    clicksByLink = await loadPageClickCounts(
      context.workspace.id,
      items.map((link) => link.id),
    );
  } catch (error) {
    console.error("failed to load click counts", error);
  }

  const now = Date.now();
  const rows: LinkListRow[] = items.map((link) => ({
    id: link.id,
    hostname: link.hostname,
    slug: link.slug,
    destination: link.destination,
    title: link.title,
    tags: link.tags,
    archived: link.archived,
    expired: link.expiresAt != null && link.expiresAt.getTime() <= now,
    startsAt: link.startsAt?.toISOString() ?? null,
    hasRules: link.rules.length > 0,
    hasPassword: link.passwordHash != null,
    createdAt: link.createdAt.toISOString(),
    clicks: clicksByLink.get(link.id) ?? 0,
  }));

  return (
    // The filter bar below owns search on this screen, so the topbar's copy of
    // it is suppressed rather than sitting there doing the same job.
    <PanelShell title={tn("links")} crumbs={[{ label: context.workspace.name }]} searchable={false}>
      <Hero
        variant="compact"
        eyebrow={t("count", { count: total })}
        title={tn("links")}
        description={t("description")}
        actions={
          <>
            {hasWorkspaceRole(context.role, "admin") || context.isSuperadmin ? (
              <>
                <RewriteDestinationsButton />
                <LinksCsvBar />
              </>
            ) : null}
            <Button variant="primary" href="/links/new">
              <Icon name="plus" className="text-sm" />
              {tc("newLink")}
            </Button>
          </>
        }
      />
      <FoldersBar folders={folderRows.map((folder) => ({ id: folder.id, name: folder.name }))} />
      <LinksTable
        rows={rows}
        total={total}
        page={query.page}
        pageSize={query.pageSize}
        search={query.search ?? ""}
        status={query.status}
        folderFiltered={query.folderId != null}
        canDelete={context.role !== "member" || context.isSuperadmin}
      />
    </PanelShell>
  );
}

import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { linkListQuerySchema } from "@short/core";
import { getTopLinks } from "@short/analytics";
import { PanelShell } from "@/components/shell/panel-shell";
import { Button, Hero } from "@/components/ui";
import { listLinks } from "@/lib/links";
import { requireWorkspace } from "@/lib/session";
import { LinksTable, type LinkListRow } from "./links-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("links") };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

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

  const query = linkListQuerySchema.parse({
    search: single(raw.search),
    status: single(raw.status) ?? "all",
    sort: single(raw.sort) ?? "created_desc",
    page: single(raw.page) ?? 1,
    pageSize: single(raw.pageSize) ?? 25,
    domainId: single(raw.domainId),
    folderId: single(raw.folderId),
    tag: single(raw.tag),
  });

  const { items, total } = await listLinks(context.workspace.id, query);

  // Click counts live in ClickHouse; a single ranked query covers the whole page.
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90);
  let clicksByLink = new Map<string, number>();
  try {
    const topLinks = await getTopLinks(
      { workspaceId: context.workspace.id, from: since, to: new Date() },
      500,
    );
    clicksByLink = new Map(topLinks.map((row) => [row.linkId, row.clicks]));
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
          <Button variant="primary" href="/links/new">
            <Icon name="plus" className="text-sm" />
            {tc("newLink")}
          </Button>
        }
      />
      <LinksTable
        rows={rows}
        total={total}
        page={query.page}
        pageSize={query.pageSize}
        search={query.search ?? ""}
        status={query.status}
        canDelete={context.role !== "member" || context.isSuperadmin}
      />
    </PanelShell>
  );
}

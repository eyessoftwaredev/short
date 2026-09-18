import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { QueryPagination } from "@/components/shell/query-pagination";
import { StatusBadge } from "@/components/shell/status-badge";
import { Badge, Button, Card, CopyButton, EmptyState, Grid } from "@/components/ui";
import { bioUrl, listBiopages } from "@/lib/biopages";
import { formatDate } from "@/lib/format";
import { requireWorkspace } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("bio");
  return { title: t("title") };
}

const PAGE_SIZE = 12;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BioListPage({ searchParams }: { searchParams: SearchParams }) {
  const [context, t, tc] = await Promise.all([
    requireWorkspace(),
    getTranslations("bio"),
    getTranslations("common"),
  ]);
  const raw = await searchParams;
  const pageParam = Number(Array.isArray(raw.page) ? raw.page[0] : raw.page);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;

  const { items, total } = await listBiopages(context.workspace.id, page, PAGE_SIZE);

  return (
    <PanelShell
      title={t("title")}
      crumbs={[{ label: context.workspace.name }]}
      topbarActions={
        <Button variant="primary" href="/bio/new">
          <Icon name="plus" className="text-sm" />
          {t("newPage")}
        </Button>
      }
    >
      {items.length === 0 ? (
        <EmptyState
          icon={<Icon name="address-card" className="text-lg" />}
          eyebrow={t("title")}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
          actions={
            <Button variant="primary" href="/bio/new">
              {t("createCta")}
            </Button>
          }
        />
      ) : (
        <>
          <Grid columns={3}>
            {items.map((item) => {
              const url = bioUrl(item.hostname, item.handle);
              return (
                <Card key={item.id} className="gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <Link
                        href={`/bio/${item.id}/edit`}
                        className="truncate text-base font-medium text-ink no-underline"
                      >
                        {item.displayName}
                      </Link>
                      <span className="truncate font-mono text-xs text-fg-muted">
                        {item.hostname}/{item.handle}
                      </span>
                    </div>
                    <StatusBadge status={item.published ? "published" : "draft"} />
                  </div>

                  {item.bio ? (
                    <p className="m-0 line-clamp-2 text-sm text-fg-muted">{item.bio}</p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="muted">{t("blocksCount", { count: item.blockCount })}</Badge>
                    <Badge tone="muted">{item.theme}</Badge>
                    <span className="font-mono text-xs text-fg-disabled">
                      {formatDate(item.updatedAt)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" href={`/bio/${item.id}/edit`}>
                      <Icon name="pen" className="text-sm" />
                      {tc("edit")}
                    </Button>
                    <Button size="sm" href={`/bio/${item.id}/stats`}>
                      <Icon name="chart-line" className="text-sm" />
                      {t("stats")}
                    </Button>
                    <Button size="sm" href={`/bio/${item.id}/leads`}>
                      <Icon name="inbox" className="text-sm" />
                      {t("leadsTitle")}
                    </Button>
                    <CopyButton value={url} label={t("copyUrl")} />
                    {item.published ? (
                      <Button size="sm" icon aria-label={t("openPage")} href={url}>
                        <Icon name="external-link" className="text-sm" />
                      </Button>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </Grid>

          <QueryPagination page={page} pageSize={PAGE_SIZE} total={total} />
        </>
      )}
    </PanelShell>
  );
}

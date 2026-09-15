import type { Metadata } from "next";
import { Contact, ExternalLink, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { PanelShell } from "@/components/shell/panel-shell";
import { QueryPagination } from "@/components/shell/query-pagination";
import { StatusBadge } from "@/components/shell/status-badge";
import { Badge, Button, Card, CopyButton, EmptyState, Grid } from "@/components/ui";
import { bioUrl, listBiopages } from "@/lib/biopages";
import { formatDate } from "@/lib/format";
import { requireWorkspace } from "@/lib/session";

export const metadata: Metadata = { title: "Bio pages" };

const PAGE_SIZE = 12;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BioListPage({ searchParams }: { searchParams: SearchParams }) {
  const context = await requireWorkspace();
  const raw = await searchParams;
  const pageParam = Number(Array.isArray(raw.page) ? raw.page[0] : raw.page);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;

  const { items, total } = await listBiopages(context.workspace.id, page, PAGE_SIZE);

  return (
    <PanelShell
      title="Bio pages"
      crumbs={[{ label: context.workspace.name }]}
      topbarActions={
        <Button variant="primary" href="/bio/new">
          <Plus className="size-4" />
          New bio page
        </Button>
      }
    >
      {items.length === 0 ? (
        <EmptyState
          icon={<Contact className="size-5" />}
          eyebrow="Bio pages"
          title="No bio pages yet"
          description="Build one page that holds every link, social profile and embed you want to share."
          actions={
            <Button variant="primary" href="/bio/new">
              Create a bio page
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
                    <Badge tone="muted">
                      {item.blockCount} block{item.blockCount === 1 ? "" : "s"}
                    </Badge>
                    <Badge tone="muted">{item.theme}</Badge>
                    <span className="font-mono text-xs text-fg-disabled">
                      {formatDate(item.updatedAt)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" href={`/bio/${item.id}/edit`}>
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                    <CopyButton value={url} label="Copy URL" />
                    {item.published ? (
                      <Button size="sm" icon aria-label="Open bio page" href={url}>
                        <ExternalLink className="size-4" />
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

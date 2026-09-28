import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { QueryPagination } from "@/components/shell/query-pagination";
import { Badge, Button, Card, Dropdown, EmptyState, Grid, Hero } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getLink } from "@/lib/links";
import { listQrCodes, qrPayload } from "@/lib/qr-codes";
import { buildQrSvg } from "@/lib/qr-svg";
import { requireWorkspace } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("qr");
  return { title: t("title") };
}

const PAGE_SIZE = 12;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function QrListPage({ searchParams }: { searchParams: SearchParams }) {
  const [context, t] = await Promise.all([requireWorkspace(), getTranslations("qr")]);
  const raw = await searchParams;
  const pageParam = Number(Array.isArray(raw.page) ? raw.page[0] : raw.page);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;

  const linkParam = Array.isArray(raw.linkId) ? raw.linkId[0] : raw.linkId;
  // Only a link from this workspace narrows the list; anything else shows every code.
  const filterLink = linkParam ? await getLink(context.workspace.id, linkParam) : null;

  const { items, total } = await listQrCodes(context.workspace.id, page, PAGE_SIZE, {
    linkId: filterLink?.id ?? null,
  });

  return (
    <PanelShell
      title={t("title")}
      crumbs={[{ label: context.workspace.name }]}
      topbarActions={
        <Button variant="primary" href="/qr/new">
          <Icon name="plus" className="text-sm" />
          {t("newCode")}
        </Button>
      }
    >
      {filterLink ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-default border border-border bg-surface-subtle px-4 py-3">
          <p className="m-0 flex min-w-0 items-center gap-2 text-sm text-fg-muted">
            <Icon name="filter" className="shrink-0 text-xs" aria-hidden="true" />
            <span className="min-w-0 truncate">
              {t.rich("filteredByLink", {
                link: () => (
                  <Link
                    href={`/links/${filterLink.id}`}
                    className="font-mono font-medium text-ink"
                  >
                    {filterLink.hostname}/{filterLink.slug}
                  </Link>
                ),
              })}
            </span>
          </p>
          <span className="flex shrink-0 items-center gap-1">
            <Button size="sm" variant="ghost" href={`/qr/new?linkId=${filterLink.id}`}>
              <Icon name="plus" className="text-sm" aria-hidden="true" />
              {t("linkCard.another")}
            </Button>
            <Button size="sm" variant="ghost" href="/qr">
              <Icon name="xmark" className="text-sm" aria-hidden="true" />
              {t("clearFilter")}
            </Button>
          </span>
        </div>
      ) : null}

      {/* `total`, not `items`: a stale ?page= past the end still shows the pager. */}
      {total === 0 && filterLink ? (
        <EmptyState
          icon={<Icon name="qrcode" className="text-lg" />}
          title={t("filteredEmptyTitle")}
          description={t("filteredEmptyDesc")}
          actions={
            <Button variant="primary" href={`/qr/new?linkId=${filterLink.id}`}>
              {t("designCta")}
            </Button>
          }
        />
      ) : total === 0 ? (
        <EmptyState
          icon={<Icon name="qrcode" className="text-lg" />}
          eyebrow={t("title")}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
          actions={
            <Button variant="primary" href="/qr/new">
              {t("designCta")}
            </Button>
          }
        />
      ) : (
        <>
          <Hero
            variant="compact"
            eyebrow={t("codesCount", { count: total })}
            title={t("title")}
            description={t("heroDesc")}
          />

          <Grid columns={4}>
            {items.map((item) => {
              // Preview only: the browser loads the logo, exports inline it server-side.
              const svg = buildQrSvg(qrPayload(item), item.style, {
                logoHref: item.style.logoUrl,
                size: 240,
              });

              return (
                <Card key={item.id} className="gap-3.5">
                  <Link
                    href={`/qr/${item.id}`}
                    aria-label={t("editNamed", { name: item.name })}
                    className="flex items-center justify-center overflow-hidden rounded-default border border-border bg-surface-subtle p-3 no-underline [&>svg]:h-auto [&>svg]:w-full [&>svg]:rounded-sm"
                    // Generated by buildQrSvg; caption and logo URL are XML-escaped.
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />

                  <div className="flex min-w-0 flex-col gap-1">
                    <Link
                      href={`/qr/${item.id}`}
                      className="truncate text-sm font-medium text-ink no-underline hover:underline"
                    >
                      {item.name}
                    </Link>
                    <span className="truncate font-mono text-xs text-fg-muted">
                      {item.payloadKind === "link"
                        ? `${item.hostname}/${item.slug}`
                        : t(`payload.${item.payloadKind}`)}
                    </span>
                    <span className="font-mono text-xs text-fg-disabled tabular-nums">
                      {t("created", { date: formatDate(item.createdAt) })}
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                    {item.payloadKind === "link" && item.linkArchived ? (
                      <Badge tone="warn">{t("linkArchived")}</Badge>
                    ) : (
                      <Badge tone="muted">{t("active")}</Badge>
                    )}
                    <span className="flex shrink-0 items-center gap-1">
                      <Button size="sm" variant="ghost" href={`/api/qr/${item.id}?format=png`}>
                        <Icon name="download" className="text-sm" aria-hidden="true" />
                        PNG
                      </Button>
                      <Dropdown
                        trigger={
                          <Button
                            size="sm"
                            variant="ghost"
                            icon
                            aria-label={t("moreExport", { name: item.name })}
                          >
                            <Icon name="ellipsis" className="text-sm" />
                          </Button>
                        }
                        items={[
                          {
                            id: "svg",
                            label: t("downloadSvg"),
                            href: `/api/qr/${item.id}?format=svg`,
                          },
                          {
                            id: "pdf",
                            label: t("downloadPdf"),
                            href: `/api/qr/${item.id}?format=pdf`,
                          },
                          {
                            id: "edit",
                            label: t("editDesign"),
                            href: `/qr/${item.id}`,
                            separated: true,
                          },
                        ]}
                      />
                    </span>
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

import { QR_PAYLOAD_KINDS } from "@short/core";
import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Icon } from "@/components/kit/icon";
import { PanelShell } from "@/components/shell/panel-shell";
import { QueryFilterBar } from "@/components/shell/query-filter-bar";
import { QueryPagination } from "@/components/shell/query-pagination";
import { Badge, Button, Callout, Card, EmptyState, Grid, PageHeader } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/format";
import { getLink } from "@/lib/links";
import {
  countQrCodesByKind,
  listQrCodes,
  loadQrScanCounts,
  parseQrKind,
  qrPayload,
  QR_SCAN_WINDOW_DAYS,
  type QrCodeWithTarget,
} from "@/lib/qr-codes";
import { describeQrPayload } from "@/lib/qr-form";
import { buildQrSvg } from "@/lib/qr-svg";
import { requireWorkspace } from "@/lib/session";
import { QrDownloadMenu } from "./qr-download-menu";
import { QR_KIND_ICONS } from "./qr-kinds";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("qr");
  return { title: t("title") };
}

const PAGE_SIZE = 12;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Thumbnail markup, or null when the stored payload cannot be drawn. One bad record
 * (e.g. a vCard saved before capacity was checked) used to take the whole list down.
 */
function thumbnail(item: QrCodeWithTarget): string | null {
  try {
    // Preview only: the browser loads the logo; exports inline it server-side.
    return buildQrSvg(qrPayload(item), item.style, { logoHref: item.style.logoUrl, size: 240 });
  } catch {
    return null;
  }
}

export default async function QrListPage({ searchParams }: { searchParams: SearchParams }) {
  const locale = await getLocale();
  const [context, t, tc] = await Promise.all([
    requireWorkspace(),
    getTranslations("qr"),
    getTranslations("common"),
  ]);
  const raw = await searchParams;
  const pageParam = Number(first(raw.page));
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const kind = parseQrKind(first(raw.type));
  const search = (first(raw.q) ?? "").trim().slice(0, 120);

  const linkParam = first(raw.linkId);
  // Only a link from this workspace narrows the list; anything else shows every code.
  const filterLink = linkParam ? await getLink(context.workspace.id, linkParam) : null;
  const linkId = filterLink?.id ?? null;

  const [{ items, total }, counts, scans] = await Promise.all([
    listQrCodes(context.workspace.id, page, PAGE_SIZE, { linkId, kind, search }),
    countQrCodesByKind(context.workspace.id, { linkId }),
    loadQrScanCounts(context.workspace.id),
  ]);

  const allTotal = QR_PAYLOAD_KINDS.reduce((sum, key) => sum + counts[key], 0);
  const filtered = kind != null || search !== "";
  const createHref = filterLink ? `/qr/new?linkId=${filterLink.id}` : "/qr/new";
  const clearHref = filterLink ? `/qr?linkId=${filterLink.id}` : "/qr";

  // Chips only for types that exist here (plus the active one), and only when there
  // is an actual choice to make.
  const kindOptions = QR_PAYLOAD_KINDS.filter((key) => counts[key] > 0 || key === kind).map(
    (key) => ({ id: key, label: t(`payload.${key}`), count: counts[key] }),
  );
  const filterOptions =
    kindOptions.length > 1 || kind != null
      ? [{ id: "all", label: t("filterAll"), count: allTotal }, ...kindOptions]
      : [];

  return (
    <PanelShell title={t("title")} crumbs={[{ label: context.workspace.name }]} searchable={false}>
      <PageHeader
        title={t("title")}
        meta={allTotal > 0 ? <Badge tone="neutral">{formatNumber(allTotal, locale)}</Badge> : null}
        description={t("listDesc")}
        actions={
          <Button variant="primary" leadingIcon="plus" href={createHref}>
            {t("createQr")}
          </Button>
        }
      />

      {filterLink ? (
        <Callout
          tone="info"
          icon="filter"
          title={t.rich("filteredByLink", {
            link: () => (
              <Link href={`/links/${filterLink.id}`} className="font-mono font-medium text-info-ink">
                {filterLink.hostname}/{filterLink.slug}
              </Link>
            ),
          })}
          actions={
            <Button size="sm" variant="ghost" leadingIcon="xmark" href="/qr">
              {t("clearFilter")}
            </Button>
          }
        />
      ) : null}

      {allTotal > 0 ? (
        <QueryFilterBar
          paramKey="type"
          options={filterOptions}
          value={kind ?? "all"}
          searchKey="q"
          searchValue={search}
          searchPlaceholder={t("searchPlaceholder")}
        />
      ) : null}

      {/* `total`, not `items`: a stale ?page= past the end still shows the pager. */}
      {total === 0 && filtered ? (
        <EmptyState
          icon="search"
          title={search !== "" ? t("noMatchesTitle", { query: search }) : t("noTypeMatchesTitle")}
          description={t("noMatchesDesc")}
          actions={
            <Button leadingIcon="xmark" href={clearHref}>
              {t("clearFilters")}
            </Button>
          }
        />
      ) : total === 0 && filterLink ? (
        <EmptyState
          tone="first-run"
          icon="qrcode"
          title={t("filteredEmptyTitle")}
          description={t("filteredEmptyDesc")}
          actions={
            <Button variant="primary" leadingIcon="plus" href={createHref}>
              {t("createQr")}
            </Button>
          }
        />
      ) : total === 0 ? (
        <EmptyState
          tone="first-run"
          icon="qrcode"
          title={t("emptyTitle")}
          description={t("emptyDesc")}
          actions={
            <Button variant="primary" leadingIcon="plus" href="/qr/new">
              {t("createFirst")}
            </Button>
          }
          hint={
            <span className="flex flex-col gap-1.5 text-left sm:items-center sm:text-center">
              <span className="inline-flex items-start gap-2">
                <Icon name="pen" className="mt-1 text-[11px] text-accent" />
                {t("emptyPointEditable")}
              </span>
              <span className="inline-flex items-start gap-2">
                <Icon name="chart-line" className="mt-1 text-[11px] text-accent" />
                {t("emptyPointTracked")}
              </span>
              <span className="inline-flex items-start gap-2">
                <Icon name="palette" className="mt-1 text-[11px] text-accent" />
                {t("emptyPointStyled")}
              </span>
            </span>
          }
        />
      ) : (
        <>
          <Grid columns={3} className="xl:grid-cols-4">
            {items.map((item) => {
              const svg = thumbnail(item);
              const isLink = item.payloadKind === "link";
              const summary = describeQrPayload(item.payloadKind, item.payload);
              const scanCount = isLink ? (scans?.get(item.id) ?? 0) : null;

              return (
                <Card
                  key={item.id}
                  padding="none"
                  footer={
                    <>
                      {/* Icon-only: four cards a row leave no room for two labelled buttons. */}
                      <Button
                        size="sm"
                        variant="ghost"
                        icon
                        href={`/qr/${item.id}`}
                        aria-label={t("editNamed", { name: item.name })}
                        title={tc("edit")}
                      >
                        <Icon name="pen" className="text-xs" />
                      </Button>
                      <QrDownloadMenu
                        qrId={item.id}
                        name={item.name}
                        extraItems={
                          isLink && item.linkId
                            ? [
                                {
                                  id: "stats",
                                  label: t("scanStats"),
                                  icon: <Icon name="chart-line" className="text-xs" />,
                                  href: `/links/${item.linkId}/stats`,
                                  separated: true,
                                },
                              ]
                            : []
                        }
                      />
                    </>
                  }
                >
                  <Link
                    href={`/qr/${item.id}`}
                    aria-label={t("editNamed", { name: item.name })}
                    className="flex items-center justify-center border-b border-border-subtle bg-surface px-6 py-5 no-underline transition-colors duration-150 hover:bg-surface-strong"
                  >
                    {svg ? (
                      <span
                        className="block w-full max-w-44 [&>svg]:h-auto [&>svg]:w-full [&>svg]:rounded-sm [&>svg]:shadow-xs"
                        // Generated by buildQrSvg; caption, labels and logo URL are XML-escaped.
                        dangerouslySetInnerHTML={{ __html: svg }}
                      />
                    ) : (
                      <span className="flex aspect-square w-full max-w-44 flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-danger-border bg-bg px-3 text-center text-xs text-danger">
                        <Icon name="warning" className="text-sm" />
                        {t("thumbnailFailed")}
                      </span>
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-col gap-2 px-4">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <Badge tone={isLink ? "accent" : "neutral"} size="sm">
                        <span className="inline-flex items-center gap-1">
                          <Icon name={QR_KIND_ICONS[item.payloadKind]} className="text-[10px]" />
                          {t(`payload.${item.payloadKind}`)}
                        </span>
                      </Badge>
                      {isLink && item.linkArchived ? (
                        <Badge tone="warn" size="sm">
                          {t("linkArchived")}
                        </Badge>
                      ) : null}
                    </div>

                    <Link
                      href={`/qr/${item.id}`}
                      className="truncate text-[15px] leading-6 font-semibold text-ink no-underline hover:text-accent-ink hover:no-underline"
                    >
                      {item.name}
                    </Link>

                    <p className="m-0 min-w-0 truncate text-[13px] leading-5 text-fg-muted">
                      {isLink && item.linkId ? (
                        <Link
                          href={`/links/${item.linkId}`}
                          className="font-mono text-fg-muted no-underline hover:text-accent-ink"
                          title={item.destination}
                        >
                          {item.hostname}/{item.slug}
                        </Link>
                      ) : (
                        <span className={item.payloadKind === "url" ? "font-mono" : undefined}>
                          {summary || t(`payload.${item.payloadKind}`)}
                        </span>
                      )}
                    </p>

                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-fg-subtle">
                      {scanCount != null && scans != null ? (
                        <span
                          className="inline-flex items-center gap-1.5"
                          title={t("scansWindow", { days: QR_SCAN_WINDOW_DAYS })}
                        >
                          <Icon name="qrcode" className="text-[10px]" />
                          <span className="numeric font-medium text-fg-muted">
                            {t("scansCount", { count: scanCount })}
                          </span>
                          <span>{t("scansWindowShort", { days: QR_SCAN_WINDOW_DAYS })}</span>
                        </span>
                      ) : !isLink ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Icon name="lock" className="text-[10px]" />
                          {t("staticCode")}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="numeric">{formatDate(item.createdAt, locale)}</span>
                    </div>
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

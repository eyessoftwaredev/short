import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ExportButtons } from "@/app/(panel)/analytics/export-buttons";
import { RecentEventsTable } from "@/app/(panel)/analytics/recent-events-table";
import { StatsToggles } from "@/app/(panel)/analytics/stats-toggles";
import { RangePicker } from "@/components/charts/range-picker";
import { StatsBreakdowns } from "@/components/charts/stats-breakdowns";
import { TimeseriesChart } from "@/components/charts/timeseries-chart";
import { PanelShell } from "@/components/shell/panel-shell";
import {
  Badge,
  Button,
  Callout,
  Card,
  CopyButton,
  CopyField,
  EmptyState,
  Grid,
  InfoTip,
  KeyValue,
  PageHeader,
  Progress,
  Section,
  Sparkline,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type KeyValueItem,
} from "@/components/ui";
import {
  loadBreakdownSet,
  loadRecentEvents,
  loadSummary,
  loadTimeseries,
  loadVariantBreakdown,
} from "@/lib/analytics";
import { getClickLimitProgress } from "@/lib/click-limits";
import { listFolders } from "@/lib/folders";
import { formatDate, formatDateTime, formatNumber, truncateMiddle } from "@/lib/format";
import { getLink, shortUrl } from "@/lib/links";
import { canWriteWorkspace, requireWorkspace } from "@/lib/session";
import { clampRangeToRetention, deltaPercent, localizedRangeLabel, resolveRange } from "@/lib/stats";
import { Favicon } from "../../favicon";
import { HealthCallout } from "../../health-callout";
import { linkStatusOf } from "../../link-state";
import { BrokenBadge, LinkStatusBadge } from "../../link-status";
import { OpenQrButton } from "../../open-qr-button";
import { listStatsSharesAction } from "../../share-actions";
import { SharePanel } from "./share-panel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("stats");
  return { title: t("statistics") };
}

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function trendOf(current: number, previous: number): "up" | "down" | "neutral" {
  const delta = deltaPercent(current, previous);
  if (delta === 0) {
    return "neutral";
  }
  return delta > 0 ? "up" : "down";
}

export default async function LinkStatsPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const context = await requireWorkspace();
  const { id } = await params;
  const raw = await searchParams;
  const locale = await getLocale();
  const range = clampRangeToRetention(
    resolveRange(raw.range, raw.from, raw.to, locale),
    context.plan.limits.retentionDays,
  );
  const includeBots = Array.isArray(raw.includeBots) ? raw.includeBots[0] === "1" : raw.includeBots === "1";
  const eventTypeRaw = Array.isArray(raw.type) ? raw.type[0] : raw.type;
  const eventType: "click" | "qr_scan" | "bio_view" | "bio_click" | undefined =
    eventTypeRaw === "click" || eventTypeRaw === "qr_scan" || eventTypeRaw === "bio_view" || eventTypeRaw === "bio_click"
      ? eventTypeRaw
      : undefined;

  const link = await getLink(context.workspace.id, id);
  if (!link) {
    notFound();
  }

  const scope = {
    workspaceId: context.workspace.id,
    linkId: link.id,
    from: range.from,
    to: range.to,
    includeBots,
    eventType,
  };

  // Custom ranges carry their dates, otherwise the export silently falls back to 30 days.
  const exportParams = new URLSearchParams({ linkId: link.id, range: range.key });
  if (range.key === "custom") {
    exportParams.set("from", range.fromDate);
    exportParams.set("to", range.toDate);
  }
  if (includeBots) {
    exportParams.set("includeBots", "1");
  }
  if (eventType) {
    exportParams.set("type", eventType);
  }
  const exportHref = `/api/analytics/export?${exportParams.toString()}`;

  const [summary, series, breakdowns, recent, variants, limits, shares, folderRows, t, tp, ts, tn] =
    await Promise.all([
      loadSummary(scope),
      loadTimeseries(scope, range.granularity),
      loadBreakdownSet(scope),
      loadRecentEvents(scope, 50),
      loadVariantBreakdown(scope),
      getClickLimitProgress(context.workspace.id, [link]),
      listStatsSharesAction(link.id),
      link.folderId ? listFolders(context.workspace.id) : Promise.resolve([]),
      getTranslations("links"),
      getTranslations("panel"),
      getTranslations("stats"),
      getTranslations("nav"),
    ]);

  const rangeLabel = localizedRangeLabel(range, ts);
  const noneDelta = ts("deltaNone");
  const granularityLabel = range.granularity === "hour" ? ts("hour") : ts("day");
  const comparison = range.comparePrevious ? tp("vsPrevious", { range: rangeLabel }) : rangeLabel;
  const deltaText = (current: number, previous: number): string => {
    const delta = deltaPercent(current, previous);
    return delta === 0 ? noneDelta : `${Math.abs(delta)}%`;
  };

  const url = shortUrl(link.hostname, link.slug);
  const returning = Math.max(summary.clicks - summary.visitors, 0);
  const hasTraffic = summary.clicks > 0 || series.length > 0;
  const peakClicks = series.reduce((acc, point) => Math.max(acc, point.clicks), 0);
  const singleBucket = series.length === 1;
  // The whole life of the link fits in the range and nothing came in: invite a share
  // instead of suggesting a wider range.
  const neverClicked = summary.clicks === 0 && link.createdAt.getTime() >= range.from.getTime();
  const now = Date.now();
  const status = linkStatusOf(
    {
      archived: link.archived,
      disabled: link.disabledAt != null,
      limitReached: link.clickLimitReachedAt != null,
      expiresAt: link.expiresAt?.toISOString() ?? null,
      startsAt: link.startsAt?.toISOString() ?? null,
    },
    now,
  );
  const limit = limits.get(link.id) ?? null;
  const folderName = link.folderId ? (folderRows.find((folder) => folder.id === link.folderId)?.name ?? null) : null;
  const editHref = `/links/${link.id}`;

  const details: KeyValueItem[] = [
    {
      id: "destination",
      label: t("detail.destination"),
      value: (
        <a href={link.destination} target="_blank" rel="noreferrer noopener" className="font-mono text-[13px]">
          {truncateMiddle(link.destination, 64)}
        </a>
      ),
      copy: link.destination,
    },
    { id: "created", label: t("colCreated"), value: formatDate(link.createdAt) },
  ];
  if (link.startsAt) {
    details.push({ id: "starts", label: t("startsAt"), value: formatDateTime(link.startsAt) });
  }
  if (link.expiresAt) {
    details.push({ id: "expires", label: t("expiresAt"), value: formatDateTime(link.expiresAt) });
  }
  if (folderName) {
    details.push({ id: "folder", label: t("folder"), value: folderName });
  }
  if (link.tags.length > 0) {
    details.push({
      id: "tags",
      label: t("tags"),
      value: (
        <span className="inline-flex flex-wrap gap-1">
          {link.tags.map((tag) => (
            <Badge key={tag} tone="neutral" size="sm">
              #{tag}
            </Badge>
          ))}
        </span>
      ),
    });
  }

  return (
    <PanelShell
      title={ts("statistics")}
      crumbs={[
        { label: context.workspace.name },
        { label: tn("links"), href: "/links" },
        { label: `${link.hostname}/${link.slug}` },
      ]}
    >
      <PageHeader
        back={{ href: "/links", label: tn("links") }}
        title={link.title || `${link.hostname}/${link.slug}`}
        meta={
          <>
            <LinkStatusBadge status={status} />
            {link.healthStatus === "broken" ? <BrokenBadge statusCode={link.healthStatusCode} /> : null}
          </>
        }
        description={
          <span className="flex min-w-0 flex-col gap-1">
            <span className="flex min-w-0 items-center gap-0.5 font-mono text-[13px] text-ink">
              <span className="min-w-0 truncate">
                {link.hostname}/{link.slug}
              </span>
              <CopyButton value={url} label={t("copyShortLink")} iconOnly className="size-7" />
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <Favicon url={link.destination} size="sm" />
              <span className="min-w-0 truncate">
                {t("detail.goesTo", { destination: truncateMiddle(link.destination, 72) })}
              </span>
            </span>
          </span>
        }
        secondaryActions={
          <>
            <Button icon leadingIcon="external-link" href={url} external aria-label={t("openShortLink")} title={t("openShortLink")} />
            <OpenQrButton linkId={link.id} />
            <Button leadingIcon="share-nodes" href="#share-stats">
              {t("detail.shareStats")}
            </Button>
          </>
        }
        actions={
          <Button variant="primary" leadingIcon="pen" href={editHref}>
            {t("detail.editLink")}
          </Button>
        }
      />

      {link.healthStatus === "broken" ? (
        <HealthCallout
          linkId={link.id}
          statusCode={link.healthStatusCode}
          brokenSince={link.brokenSince?.toISOString() ?? null}
          editHref={editHref}
        />
      ) : null}

      {status === "limit" ? (
        <Callout
          tone="warn"
          icon="gauge-high"
          title={t("detail.limitReachedTitle", { limit: formatNumber(link.maxClicks ?? 0) })}
          actions={
            <Button size="sm" href={editHref}>
              {t("detail.raiseLimit")}
            </Button>
          }
        >
          {link.expiredDestination ? t("detail.limitReachedRedirect") : t("detail.limitReachedBody")}
        </Callout>
      ) : status === "expired" ? (
        <Callout
          tone="neutral"
          icon="clock"
          title={t("detail.expiredTitle", { date: formatDateTime(link.expiresAt ?? new Date()) })}
          actions={
            <Button size="sm" href={editHref}>
              {t("detail.extend")}
            </Button>
          }
        >
          {link.expiredDestination ? t("detail.expiredRedirect") : t("detail.expiredBody")}
        </Callout>
      ) : status === "scheduled" && link.startsAt ? (
        <Callout tone="info" icon="calendar" title={t("detail.scheduledTitle", { date: formatDateTime(link.startsAt) })}>
          {t("detail.scheduledBody")}
        </Callout>
      ) : status === "archived" ? (
        <Callout
          tone="neutral"
          icon="archive"
          title={t("detail.archivedTitle")}
          actions={
            <Button size="sm" href={`${editHref}#section-status`}>
              {t("detail.restore")}
            </Button>
          }
        >
          {t("archiveDesc")}
        </Callout>
      ) : status === "disabled" ? (
        <Callout tone="danger" icon="ban" title={t("detail.disabledTitle")}>
          {t("detail.disabledBody")}
        </Callout>
      ) : null}

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card title={t("detail.shortLinkTitle")} description={t("detail.shortLinkDesc")}>
          <CopyField value={url} href={url} label={t("form.yourShortLink")} info={t("form.yourShortLinkInfo")} />
          <CopyField
            size="sm"
            label={t("detail.previewLink")}
            info={t("detail.previewLinkInfo")}
            value={`${url}+`}
            href={`${url}+`}
            hint={t("detail.previewLinkHint")}
          />
        </Card>

        <Card title={t("detail.detailsTitle")}>
          <KeyValue items={details} />
          {limit && limit.maxClicks != null ? (
            <div className="flex min-w-0 flex-col gap-2 border-t border-border-subtle pt-3">
              <span className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-1.5 text-fg-muted">
                  {t("detail.clickLimit")}
                  <InfoTip label={t("detail.clickLimit")}>{t("form.maxClicksInfo")}</InfoTip>
                </span>
                <span className="numeric font-medium text-ink">
                  {limit.clicks == null
                    ? t("detail.limitUnknown", { limit: formatNumber(limit.maxClicks) })
                    : t("detail.limitUsed", { used: formatNumber(limit.clicks), limit: formatNumber(limit.maxClicks) })}
                </span>
              </span>
              {limit.clicks != null ? (
                <Progress
                  value={limit.clicks}
                  max={Math.max(limit.maxClicks, 1)}
                  label={t("detail.clickLimit")}
                  tone={limit.reached ? "danger" : limit.clicks / limit.maxClicks >= 0.85 ? "warn" : "accent"}
                />
              ) : null}
              <span className="text-[13px] text-fg-subtle">
                {limit.reached
                  ? t("detail.limitReachedShort")
                  : limit.clicks != null
                    ? t("detail.limitLeft", { count: Math.max(limit.maxClicks - limit.clicks, 0) })
                    : null}
              </span>
            </div>
          ) : null}
        </Card>
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <StatsToggles />
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons href={exportHref} />
          <RangePicker value={range.key} />
        </div>
      </div>

      <Grid columns={4}>
        <StatCard
          icon="arrow-pointer"
          label={ts("clicks")}
          info={t("detail.clicksInfo")}
          value={formatNumber(summary.clicks)}
          delta={range.comparePrevious ? deltaText(summary.clicks, summary.previousClicks) : undefined}
          trend={range.comparePrevious ? trendOf(summary.clicks, summary.previousClicks) : "neutral"}
          deltaLabel={comparison}
          sparkline={series.length > 1 ? <Sparkline data={series.map((point) => point.clicks)} tone="chart-1" /> : null}
        />
        <StatCard
          icon="users"
          label={tp("uniqueVisitors")}
          info={tp("visitorsInfo")}
          value={formatNumber(summary.visitors)}
          delta={range.comparePrevious ? deltaText(summary.visitors, summary.previousVisitors) : undefined}
          trend={range.comparePrevious ? trendOf(summary.visitors, summary.previousVisitors) : "neutral"}
          deltaLabel={comparison}
          sparkline={series.length > 1 ? <Sparkline data={series.map((point) => point.visitors)} tone="chart-2" /> : null}
        />
        <StatCard
          icon="repeat"
          label={ts("repeatClicks")}
          info={t("detail.repeatInfo")}
          value={formatNumber(returning)}
          deltaLabel={ts("repeatClicksDelta")}
        />
        <StatCard
          icon="earth"
          label={ts("countries")}
          info={tp("countriesInfo")}
          value={formatNumber(summary.countries)}
          deltaLabel={ts("distinctCountries")}
        />
      </Grid>

      <Card
        title={
          <span className="inline-flex items-center gap-1.5">
            {tp("clickTrend")}
            <InfoTip label={tp("clickTrend")}>{tp("clickTrendInfo")}</InfoTip>
          </span>
        }
        description={
          series.length > 0
            ? `${range.granularity === "hour" ? tp("clickTrendDescHour") : tp("clickTrendDescDay")} · ${tp("peak", {
                value: formatNumber(peakClicks),
                granularity: granularityLabel,
              })}`
            : range.granularity === "hour"
              ? tp("clickTrendDescHour")
              : tp("clickTrendDescDay")
        }
      >
        {series.length === 0 ? (
          <EmptyState
            bare
            size="sm"
            tone={neverClicked ? "first-run" : "default"}
            icon="chart-line"
            title={neverClicked ? t("detail.noClicksYet") : tp("noClicksRange")}
            description={neverClicked ? t("detail.noClicksYetBody") : ts("noClicksLinkBody")}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 text-xs text-fg-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-pill bg-chart-1" aria-hidden="true" />
                {ts("clicks")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-pill bg-chart-2" aria-hidden="true" />
                {tp("uniqueVisitors")}
              </span>
              {singleBucket ? (
                <span className="ml-auto text-fg-subtle">{ts("singleBucket", { granularity: granularityLabel })}</span>
              ) : null}
            </div>
            <TimeseriesChart data={series} granularity={range.granularity} />
          </>
        )}
      </Card>

      {link.abVariants.length > 0 ? (
        <Card padding="none" title={ts("abReport")} description={ts("abReportDesc")}>
          <Table bare label={ts("abReport")}>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{ts("variant")}</TableHeaderCell>
                <TableHeaderCell numeric>{ts("clicks")}</TableHeaderCell>
                <TableHeaderCell numeric>{ts("visitors")}</TableHeaderCell>
                <TableHeaderCell numeric>{ts("shareOfClicks")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {link.abVariants.map((variant, index) => {
                const row = variants.find((item) => item.variantId === variant.id);
                const leader = variants[0]?.variantId === variant.id && (variants[0]?.clicks ?? 0) > 0;
                return (
                  <TableRow key={variant.id}>
                    <TableCell truncate>
                      <span className="flex min-w-0 items-center gap-2">
                        <Badge tone="neutral" size="sm">
                          {t("variant", { n: index + 1 })}
                        </Badge>
                        <span className="min-w-0 truncate font-mono text-[13px]">{variant.destination}</span>
                        {leader ? (
                          <Badge tone="success" size="sm">
                            {ts("winner")}
                          </Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell numeric>{formatNumber(row?.clicks ?? 0)}</TableCell>
                    <TableCell numeric>{formatNumber(row?.visitors ?? 0)}</TableCell>
                    <TableCell numeric>{Math.round((row?.share ?? 0) * 100)}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : null}

      <Card title={ts("breakdown")} description={ts("breakdownLinkDesc")}>
        {hasTraffic ? (
          <StatsBreakdowns data={breakdowns} />
        ) : (
          <EmptyState
            bare
            size="sm"
            icon="earth"
            title={ts("nothingToBreakDown")}
            description={ts("nothingToBreakDownLinkBody")}
          />
        )}
      </Card>

      <Section
        title={ts("recentClicks")}
        description={ts("recentClicksDesc")}
        meta={
          recent.length > 0 ? (
            <span className="numeric text-[13px] text-fg-subtle">{ts("eventsCount", { count: recent.length })}</span>
          ) : null
        }
      >
        <RecentEventsTable events={recent} />
      </Section>

      <SharePanel
        linkId={link.id}
        initialShares={shares.ok ? shares.data : []}
        canManage={canWriteWorkspace(context)}
      />
    </PanelShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { RangePicker } from "@/components/charts/range-picker";
import { StatsBreakdowns } from "@/components/charts/stats-breakdowns";
import { TimeseriesChart } from "@/components/charts/timeseries-chart";
import { PanelShell } from "@/components/shell/panel-shell";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Grid,
  InfoTip,
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
} from "@/components/ui";
import {
  loadBreakdownSet,
  loadRecentEvents,
  loadSummary,
  loadTimeseries,
  loadTopLinks,
} from "@/lib/analytics";
import { formatNumber } from "@/lib/format";
import { getLink, listWorkspaceDomains } from "@/lib/links";
import { requireWorkspace } from "@/lib/session";
import {
  LIFETIME_FROM,
  clampRangeToRetention,
  deltaPercent,
  firstParam,
  formatShare,
  localizedRangeLabel,
  previousTotalEvents,
  resolveRange,
  totalEvents,
  trendOf,
} from "@/lib/stats";
import { AnalyticsFilters, type AnalyticsLinkOption } from "./analytics-filters";
import { ExportButtons } from "./export-buttons";
import { RecentEventsTable } from "./recent-events-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("analytics") };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const EVENT_TYPES = ["click", "qr_scan", "bio_view", "bio_click"] as const;
type EventType = (typeof EVENT_TYPES)[number];

function parseEventType(value: string | undefined): EventType | undefined {
  return EVENT_TYPES.find((type) => type === value);
}

export default async function AnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const context = await requireWorkspace();
  const raw = await searchParams;
  const locale = await getLocale();
  const workspaceId = context.workspace.id;
  const range = clampRangeToRetention(
    resolveRange(raw.range, raw.from, raw.to, locale),
    context.plan.limits.retentionDays,
  );
  const includeBots = firstParam(raw.includeBots) === "1";
  const eventType = parseEventType(firstParam(raw.type));

  // Link and domain filters are checked against this workspace, so a stale or hand-edited
  // URL silently falls back to "all" instead of narrowing to nothing.
  const [selectedLink, domainRows] = await Promise.all([
    firstParam(raw.link) ? getLink(workspaceId, firstParam(raw.link) ?? "") : Promise.resolve(null),
    listWorkspaceDomains(workspaceId),
  ]);
  const domainOptions = domainRows.map((row) => row.hostname);
  const requestedDomain = firstParam(raw.domain)?.toLowerCase() ?? null;
  const hostname = requestedDomain && domainOptions.includes(requestedDomain) ? requestedDomain : null;

  const baseScope = { workspaceId, from: range.from, to: range.to, includeBots };
  const scope = {
    ...baseScope,
    eventType,
    linkId: selectedLink?.id,
    hostname: hostname ?? undefined,
  };
  const filtered = Boolean(eventType || selectedLink || hostname || includeBots);

  // Custom ranges carry their dates, otherwise the export silently falls back to 7 days.
  const exportParams = new URLSearchParams({ range: range.key });
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
  if (selectedLink) {
    exportParams.set("linkId", selectedLink.id);
  }
  if (hostname) {
    exportParams.set("domain", hostname);
  }
  const exportHref = `/api/analytics/export?${exportParams.toString()}`;

  const [summary, series, breakdowns, topLinks, linkChoices, recent, t, tc, ts, tn] = await Promise.all([
    loadSummary(scope),
    loadTimeseries(scope, range.granularity),
    loadBreakdownSet(scope, 12),
    loadTopLinks(scope, 15),
    // The link picker lists the links that had traffic in this range, unfiltered.
    loadTopLinks(baseScope, 50),
    loadRecentEvents(scope, 50),
    getTranslations("panel"),
    getTranslations("common"),
    getTranslations("stats"),
    getTranslations("nav"),
  ]);

  const total = totalEvents(summary);
  const previousTotal = previousTotalEvents(summary);
  const hasTraffic = total > 0;
  // Only worth a query when the report is empty: has this workspace ever been visited?
  const everVisited =
    hasTraffic || filtered
      ? true
      : totalEvents(await loadSummary({ workspaceId, from: LIFETIME_FROM, to: new Date() })) > 0;

  const linkOptions: AnalyticsLinkOption[] = linkChoices.map((row) => ({
    id: row.linkId,
    label: `${row.hostname}/${row.slug}`,
  }));
  if (selectedLink && !linkOptions.some((option) => option.id === selectedLink.id)) {
    linkOptions.unshift({ id: selectedLink.id, label: `${selectedLink.hostname}/${selectedLink.slug}` });
  }

  const rangeLabel = localizedRangeLabel(range, ts);
  const noneDelta = ts("deltaNone");
  const granularityLabel = range.granularity === "hour" ? ts("hour") : ts("day");
  const comparison = range.comparePrevious ? t("vsPrevious", { range: rangeLabel }) : rangeLabel;
  const deltaText = (current: number, previous: number): string | undefined => {
    if (!range.comparePrevious) {
      return undefined;
    }
    const delta = deltaPercent(current, previous);
    return delta === 0 ? noneDelta : `${Math.abs(delta)}%`;
  };
  const trend = (current: number, previous: number) =>
    range.comparePrevious ? trendOf(current, previous) : "neutral";

  const retentionNote =
    context.plan.limits.retentionDays === -1
      ? ts("unlimitedRetention")
      : ts("retentionDays", { days: context.plan.limits.retentionDays, plan: context.plan.name });

  const peakClicks = series.reduce((acc, point) => Math.max(acc, point.clicks), 0);
  const singleBucket = series.filter((point) => point.clicks > 0).length === 1;

  /** Same page with one filter changed — the per-type cards drill down with it. */
  const withParams = (patch: Record<string, string | null>): string => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(raw)) {
      const single = firstParam(value);
      if (single) {
        next.set(key, single);
      }
    }
    for (const [key, value] of Object.entries(patch)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    const query = next.toString();
    return query === "" ? "/analytics" : `/analytics?${query}`;
  };

  const header = (
    <PageHeader
      title={ts("workspaceAnalytics")}
      meta={<Badge tone="neutral">{retentionNote}</Badge>}
      description={
        range.comparePrevious
          ? ts("analyticsDesc", { workspace: context.workspace.name, range: rangeLabel })
          : ts("analyticsDescAll", { workspace: context.workspace.name, range: rangeLabel })
      }
      secondaryActions={
        <>
          <ExportButtons href={exportHref} />
          <RangePicker value={range.key} />
        </>
      }
    />
  );

  if (!everVisited) {
    return (
      <PanelShell title={tn("analytics")} crumbs={[{ label: context.workspace.name }]}>
        {header}
        <EmptyState
          tone="first-run"
          icon="chart-line"
          title={ts("firstRunTitle")}
          description={ts("firstRunBody")}
          actions={
            <>
              <Button variant="primary" leadingIcon="plus" href="/links/new">
                {tc("newLink")}
              </Button>
              <Button leadingIcon="qrcode" href="/qr/new">
                {ts("firstRunQr")}
              </Button>
            </>
          }
          hint={ts("firstRunHint")}
        />
      </PanelShell>
    );
  }

  return (
    <PanelShell title={tn("analytics")} crumbs={[{ label: context.workspace.name }]}>
      {header}

      <AnalyticsFilters
        links={linkOptions}
        domains={domainOptions}
        link={selectedLink?.id ?? null}
        domain={hostname}
        type={eventType ?? null}
        includeBots={includeBots}
      />

      <Grid columns={4}>
        <StatCard
          icon="arrow-pointer"
          label={eventType ? ts(`typeLong.${eventType}`) : ts("totalClicks")}
          info={ts("totalClicksInfo")}
          value={formatNumber(total, locale)}
          delta={deltaText(total, previousTotal)}
          trend={trend(total, previousTotal)}
          deltaLabel={comparison}
          sparkline={
            series.length > 1 && hasTraffic ? (
              <Sparkline data={series.map((point) => point.clicks)} tone="chart-1" />
            ) : null
          }
        />
        <StatCard
          icon="users"
          label={t("uniqueVisitors")}
          info={t("visitorsInfo")}
          value={formatNumber(summary.visitors, locale)}
          delta={deltaText(summary.visitors, summary.previousVisitors)}
          trend={trend(summary.visitors, summary.previousVisitors)}
          deltaLabel={comparison}
          sparkline={
            series.length > 1 && hasTraffic ? (
              <Sparkline data={series.map((point) => point.visitors)} tone="chart-2" />
            ) : null
          }
        />
        <StatCard
          icon="repeat"
          label={ts("clicksPerVisitor")}
          info={ts("clicksPerVisitorInfo")}
          value={summary.visitors === 0 ? "0" : (total / summary.visitors).toFixed(1)}
          deltaLabel={ts("averageInRange")}
        />
        <StatCard
          icon="earth"
          label={ts("countries")}
          info={ts("countriesInfo")}
          value={formatNumber(summary.countries, locale)}
          deltaLabel={ts("distinctCountries")}
        />
      </Grid>

      {eventType ? null : (
        <Grid columns={4}>
          <StatCard
            icon="link"
            label={ts("typeLong.click")}
            info={ts("linkClicksInfo")}
            value={formatNumber(summary.clicks, locale)}
            delta={deltaText(summary.clicks, summary.previousClicks)}
            trend={trend(summary.clicks, summary.previousClicks)}
            deltaLabel={formatShare(summary.clicks, total)}
            href={withParams({ type: "click" })}
          />
          <StatCard
            icon="qrcode"
            label={ts("typeLong.qr_scan")}
            info={ts("qrScansInfo")}
            value={formatNumber(summary.qrScans, locale)}
            delta={deltaText(summary.qrScans, summary.previousQrScans)}
            trend={trend(summary.qrScans, summary.previousQrScans)}
            deltaLabel={formatShare(summary.qrScans, total)}
            href={withParams({ type: "qr_scan" })}
          />
          <StatCard
            icon="address-card"
            label={ts("typeLong.bio_view")}
            info={ts("bioViewsInfo")}
            value={formatNumber(summary.bioViews, locale)}
            delta={deltaText(summary.bioViews, summary.previousBioViews)}
            trend={trend(summary.bioViews, summary.previousBioViews)}
            deltaLabel={formatShare(summary.bioViews, total)}
            href={withParams({ type: "bio_view" })}
          />
          <StatCard
            icon="arrow-pointer"
            label={ts("typeLong.bio_click")}
            info={ts("bioClicksInfo")}
            value={formatNumber(summary.bioClicks, locale)}
            delta={deltaText(summary.bioClicks, summary.previousBioClicks)}
            trend={trend(summary.bioClicks, summary.previousBioClicks)}
            deltaLabel={formatShare(summary.bioClicks, total)}
            href={withParams({ type: "bio_click" })}
          />
        </Grid>
      )}

      <Card
        title={
          <span className="inline-flex items-center gap-1.5">
            {ts("trafficOverTime")}
            <InfoTip label={ts("trafficOverTime")}>{t("clickTrendInfo")}</InfoTip>
          </span>
        }
        description={
          hasTraffic
            ? `${range.granularity === "hour" ? ts("trafficOverTimeHour") : ts("trafficOverTimeDay")} · ${t(
                "peak",
                {
                  value: formatNumber(peakClicks, locale),
                  granularity: granularityLabel,
                },
              )}`
            : range.granularity === "hour"
              ? ts("trafficOverTimeHour")
              : ts("trafficOverTimeDay")
        }
      >
        {hasTraffic ? (
          <>
            <div className="flex flex-wrap items-center gap-4 text-xs text-fg-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-pill bg-chart-1" aria-hidden="true" />
                {eventType ? ts(`typeLong.${eventType}`) : ts("clicks")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-pill bg-chart-2" aria-hidden="true" />
                {t("uniqueVisitors")}
              </span>
              {singleBucket ? (
                <span className="ml-auto text-fg-subtle">
                  {ts("singleBucket", { granularity: granularityLabel })}
                </span>
              ) : null}
            </div>
            <TimeseriesChart
              data={series}
              granularity={range.granularity}
              height={300}
              clicksLabel={eventType ? ts(`typeLong.${eventType}`) : undefined}
            />
          </>
        ) : (
          <EmptyState
            bare
            size="sm"
            icon="chart-line"
            title={filtered ? ts("noMatchTitle") : t("noClicksRange")}
            description={filtered ? ts("noMatchBody") : t("noClicksRangeBody")}
            actions={
              filtered ? (
                <Button
                  leadingIcon="xmark"
                  href={withParams({ link: null, domain: null, type: null, includeBots: null })}
                >
                  {ts("clearFilters")}
                </Button>
              ) : null
            }
            hint={filtered ? undefined : ts("tryWiderRange")}
          />
        )}
      </Card>

      {hasTraffic ? (
        <Section
          title={
            <span className="inline-flex items-center gap-1.5">
              {ts("breakdown")}
              <InfoTip label={ts("breakdown")}>{ts("breakdownInfo")}</InfoTip>
            </span>
          }
          description={ts("breakdownFriendlyDesc")}
        >
          <StatsBreakdowns data={breakdowns} includeBots={includeBots} />
        </Section>
      ) : null}

      <Card
        id="top-links"
        padding="none"
        title={t("topLinks")}
        description={t("topLinksDesc")}
        actions={
          topLinks.length > 0 ? (
            <span className="numeric text-xs text-fg-subtle">
              {ts("shownCount", { count: topLinks.length })}
            </span>
          ) : null
        }
      >
        {topLinks.length === 0 ? (
          <EmptyState
            bare
            size="sm"
            icon="link"
            title={ts("noLinkTraffic")}
            description={ts("noLinkTrafficBody")}
          />
        ) : (
          <Table bare label={ts("tableTopLinks")}>
            <TableHead>
              <TableRow>
                <TableHeaderCell numeric className="w-12">
                  #
                </TableHeaderCell>
                <TableHeaderCell>{t("link")}</TableHeaderCell>
                <TableHeaderCell numeric className="w-28">
                  {ts("clicks")}
                </TableHeaderCell>
                <TableHeaderCell numeric className="w-28">
                  {ts("visitors")}
                </TableHeaderCell>
                <TableHeaderCell className="w-44">{ts("shareOfClicks")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topLinks.map((row, index) => {
                const share = total === 0 ? 0 : Math.round((row.clicks / total) * 100);
                return (
                  <TableRow key={row.linkId}>
                    <TableCell numeric className="text-fg-subtle">
                      {index + 1}
                    </TableCell>
                    <TableCell truncate>
                      <Link
                        href={`/links/${row.linkId}/stats`}
                        className="truncate font-mono text-[13px] text-ink no-underline hover:text-accent-ink"
                      >
                        <span className="text-fg-subtle">{row.hostname}/</span>
                        <span className="font-medium">{row.slug}</span>
                      </Link>
                    </TableCell>
                    <TableCell numeric>{formatNumber(row.clicks, locale)}</TableCell>
                    <TableCell numeric className="text-fg-muted">
                      {formatNumber(row.visitors, locale)}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2.5">
                        <Progress value={share} animate={false} size="sm" className="min-w-0 flex-1" />
                        <span className="numeric w-10 shrink-0 text-right text-xs text-fg-muted">
                          {formatShare(row.clicks, total)}
                        </span>
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card
        id="recent"
        padding="none"
        title={ts("recentClicks")}
        description={ts("recentWorkspaceDesc")}
        actions={
          recent.length > 0 ? (
            <span className="numeric text-xs text-fg-subtle">
              {ts("eventsCount", { count: recent.length })}
            </span>
          ) : null
        }
      >
        <RecentEventsTable events={recent} showLink bare />
      </Card>
    </PanelShell>
  );
}

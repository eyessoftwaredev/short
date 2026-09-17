import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { RangePicker } from "@/components/charts/range-picker";
import { StatsBreakdowns } from "@/components/charts/stats-breakdowns";
import { TimeseriesChart } from "@/components/charts/timeseries-chart";
import { PanelShell } from "@/components/shell/panel-shell";
import {
  Button,
  Card,
  EmptyState,
  Grid,
  Hero,
  Progress,
  Section,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { loadBreakdownSet, loadSummary, loadTimeseries, loadTopLinks } from "@/lib/analytics";
import { formatNumber } from "@/lib/format";
import { requireWorkspace } from "@/lib/session";
import { clampRangeToRetention, deltaPercent, formatDelta, localizedRangeLabel, resolveRange } from "@/lib/stats";
import { ExportButtons } from "./export-buttons";
import { StatsToggles } from "./stats-toggles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("analytics") };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function trendOf(current: number, previous: number): "up" | "down" | "neutral" {
  const delta = deltaPercent(current, previous);
  if (delta === 0) {
    return "neutral";
  }
  return delta > 0 ? "up" : "down";
}

export default async function AnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const context = await requireWorkspace();
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

  const scope = {
    workspaceId: context.workspace.id,
    from: range.from,
    to: range.to,
    includeBots,
    eventType,
  };

  const [summary, series, breakdowns, topLinks, t, tc, ts, tn] = await Promise.all([
    loadSummary(scope),
    loadTimeseries(scope, range.granularity),
    loadBreakdownSet(scope, 12),
    loadTopLinks(scope, 15),
    getTranslations("panel"),
    getTranslations("common"),
    getTranslations("stats"),
    getTranslations("nav"),
  ]);

  const rangeLabel = localizedRangeLabel(range, ts);
  const noneDelta = ts("deltaNone");
  const granularityLabel = range.granularity === "hour" ? ts("hour") : ts("day");

  const retentionNote =
    context.plan.limits.retentionDays === -1
      ? ts("unlimitedRetention")
      : ts("retentionDays", { days: context.plan.limits.retentionDays, plan: context.plan.name });

  const hasTraffic = summary.clicks > 0 || series.length > 0;
  const peakClicks = series.reduce((acc, point) => Math.max(acc, point.clicks), 0);
  const singleBucket = series.length === 1;

  return (
    <PanelShell title={tn("analytics")} crumbs={[{ label: context.workspace.name }]}>
      <Hero
        variant="compact"
        eyebrow={retentionNote}
        title={ts("workspaceAnalytics")}
        description={
          range.comparePrevious
            ? ts("analyticsDesc", { workspace: context.workspace.name, range: rangeLabel })
            : ts("analyticsDescAll", { workspace: context.workspace.name, range: rangeLabel })
        }
        actions={
          <>
            <StatsToggles />
            <ExportButtons href={`/api/analytics/export?range=${range.key}${includeBots ? "&includeBots=1" : ""}${eventType ? `&type=${eventType}` : ""}`} />
            <RangePicker value={range.key} />
          </>
        }
      />

      <Grid columns={4}>
        <Card
          icon={<Icon name="arrow-pointer" className="text-sm" />}
          label={ts("clicks")}
          value={formatNumber(summary.clicks)}
          trend={trendOf(summary.clicks, summary.previousClicks)}
          delta={
            <>
              {range.comparePrevious ? (
                <>
                  {formatDelta(summary.clicks, summary.previousClicks, noneDelta)}{" "}
                  <span className="text-fg-subtle">{t("vsPrevious", { range: rangeLabel })}</span>
                </>
              ) : (
                <span className="text-fg-subtle">{rangeLabel}</span>
              )}
            </>
          }
        />
        <Card
          icon={<Icon name="users" className="text-sm" />}
          label={t("uniqueVisitors")}
          value={formatNumber(summary.visitors)}
          trend={trendOf(summary.visitors, summary.previousVisitors)}
          delta={
            <>
              {range.comparePrevious ? (
                <>
                  {formatDelta(summary.visitors, summary.previousVisitors, noneDelta)}{" "}
                  <span className="text-fg-subtle">{t("vsPrevious", { range: rangeLabel })}</span>
                </>
              ) : (
                <span className="text-fg-subtle">{rangeLabel}</span>
              )}
            </>
          }
        />
        <Card
          icon={<Icon name="repeat" className="text-sm" />}
          label={ts("clicksPerVisitor")}
          value={summary.visitors === 0 ? "0.0" : (summary.clicks / summary.visitors).toFixed(1)}
          delta={ts("averageInRange")}
        />
        <Card
          icon={<Icon name="earth" className="text-sm" />}
          label={ts("countries")}
          value={formatNumber(summary.countries)}
          delta={ts("distinctCountries")}
        />
      </Grid>
      <Grid columns={3}>
        <Card label={ts("qrScans")} value={formatNumber(summary.qrScans)} />
        <Card label={ts("bioViews")} value={formatNumber(summary.bioViews)} />
        <Card label={ts("bioClicks")} value={formatNumber(summary.bioClicks)} />
      </Grid>

      <Section
        title={ts("trafficOverTime")}
        description={range.granularity === "hour" ? ts("trafficOverTimeHour") : ts("trafficOverTimeDay")}
        meta={
          series.length > 0 ? (
            <span className="numeric font-mono">
              {t("peak", { value: formatNumber(peakClicks), granularity: granularityLabel })}
            </span>
          ) : null
        }
      >
        <Card staticHover>
          {series.length === 0 ? (
            <EmptyState
              size="sm"
              tone="first-run"
              icon={<Icon name="chart-line" className="text-sm" />}
              title={t("noClicksRange")}
              description={t("noClicksRangeBody")}
              actions={
                <Button variant="primary" href="/links/new">
                  <Icon name="plus" className="text-sm" />
                  {tc("newLink")}
                </Button>
              }
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
                  {t("uniqueVisitors")}
                </span>
                {singleBucket ? (
                  <span className="ml-auto text-fg-subtle">
                    {ts("singleBucket", { granularity: granularityLabel })}
                  </span>
                ) : null}
              </div>
              <TimeseriesChart data={series} granularity={range.granularity} height={300} />
            </>
          )}
        </Card>
      </Section>

      <Section title={ts("breakdown")} description={ts("breakdownDesc")} headingLevel={2}>
        {hasTraffic ? (
          <StatsBreakdowns data={breakdowns} />
        ) : (
          <EmptyState
            size="sm"
            icon={<Icon name="earth" className="text-sm" />}
            title={ts("nothingToBreakDown")}
            description={ts("nothingToBreakDownBody")}
          />
        )}
      </Section>

      <Section
        title={t("topLinks")}
        description={t("topLinksDesc")}
        meta={
          topLinks.length > 0 ? (
            <span className="numeric font-mono">{ts("shownCount", { count: topLinks.length })}</span>
          ) : null
        }
      >
        {topLinks.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Icon name="chart-line" className="text-sm" />}
            title={ts("noLinkTraffic")}
            description={ts("noLinkTrafficBody")}
          />
        ) : (
          <Table label={ts("tableTopLinks")}>
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
                const share =
                  summary.clicks === 0 ? 0 : Math.round((row.clicks / summary.clicks) * 100);
                return (
                  <TableRow key={row.linkId}>
                    <TableCell numeric className="text-fg-subtle">
                      {index + 1}
                    </TableCell>
                    <TableCell truncate>
                      <Link
                        href={`/links/${row.linkId}/stats`}
                        className="truncate font-mono text-sm text-ink no-underline hover:text-accent-ink"
                      >
                        <span className="text-fg-subtle">{row.hostname}/</span>
                        <span className="font-medium">{row.slug}</span>
                      </Link>
                    </TableCell>
                    <TableCell numeric>{formatNumber(row.clicks)}</TableCell>
                    <TableCell numeric className="text-fg-muted">
                      {formatNumber(row.visitors)}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2.5">
                        <Progress
                          value={share}
                          animate={false}
                          className="h-1.5 min-w-0 flex-1"
                        />
                        <span className="numeric w-8 shrink-0 text-right font-mono text-xs text-fg-muted">
                          {share}%
                        </span>
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Section>
    </PanelShell>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getBreakdown, type BreakdownRow } from "@short/analytics";
import { ExportButtons } from "@/app/(panel)/analytics/export-buttons";
import { RecentEventsTable } from "@/app/(panel)/analytics/recent-events-table";
import { RangePicker } from "@/components/charts/range-picker";
import { StatsBreakdowns } from "@/components/charts/stats-breakdowns";
import { TimeseriesChart } from "@/components/charts/timeseries-chart";
import { Icon } from "@/components/kit/icon";
import { PanelShell } from "@/components/shell/panel-shell";
import {
  BreakdownList,
  Button,
  Card,
  EmptyState,
  Grid,
  InfoTip,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { loadBreakdownSet, loadRecentEvents, loadSummary, loadTimeseries } from "@/lib/analytics";
import { bioUrl, getBiopage } from "@/lib/biopages";
import { formatNumber } from "@/lib/format";
import { requireWorkspace } from "@/lib/session";
import {
  clampRangeToRetention,
  deltaPercent,
  localizedRangeLabel,
  resolveRange,
} from "@/lib/stats";
import { BLOCK_ICONS } from "../../block-meta";
import { BioStatusBadge } from "../../bio-status";
import { bioStatusOf } from "../../status";
import { BotsToggle } from "./bots-toggle";

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

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BioStatsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const context = await requireWorkspace();
  const [{ id }, raw, locale] = await Promise.all([params, searchParams, getLocale()]);
  const range = clampRangeToRetention(
    resolveRange(raw.range, raw.from, raw.to, locale),
    context.plan.limits.retentionDays,
  );
  const includeBots = first(raw.includeBots) === "1";

  const page = await getBiopage(context.workspace.id, id);
  if (!page) {
    notFound();
  }

  const scope = {
    workspaceId: context.workspace.id,
    biopageId: page.id,
    from: range.from,
    to: range.to,
    includeBots,
  };

  // Custom ranges travel as from/to, so the export has to carry them too.
  const exportParams = new URLSearchParams({ biopageId: page.id, range: range.key });
  if (range.key === "custom") {
    exportParams.set("from", range.fromDate);
    exportParams.set("to", range.toDate);
  }
  if (includeBots) {
    exportParams.set("includeBots", "1");
  }
  const exportHref = `/api/bio/stats/export?${exportParams.toString()}`;
  const url = bioUrl(page.hostname, page.handle);

  const [summary, series, breakdowns, recent, blockRows, t, ts] = await Promise.all([
    loadSummary(scope),
    loadTimeseries(scope, range.granularity),
    loadBreakdownSet(scope),
    loadRecentEvents(scope, 50),
    getBreakdown({ ...scope, eventType: "bio_click" }, "block", 12).catch((error: unknown) => {
      console.error("[analytics] breakdown:block failed", error);
      return [] as BreakdownRow[];
    }),
    getTranslations("bio"),
    getTranslations("stats"),
  ]);

  const rangeLabel = localizedRangeLabel(range, ts);
  const noneDelta = ts("deltaNone");
  const comparison = range.comparePrevious ? t("statsPage.vsPrevious", { range: rangeLabel }) : rangeLabel;
  // WITH FILL returns a zero row per bucket, so an empty range still has points.
  const hasTraffic = summary.bioViews > 0 || summary.bioClicks > 0 || series.some((point) => point.clicks > 0);
  const status = bioStatusOf(page);

  const deltaText = (current: number, previous: number): string | undefined => {
    if (!range.comparePrevious) {
      return undefined;
    }
    const delta = deltaPercent(current, previous);
    return delta === 0 ? noneDelta : `${Math.abs(delta)}%`;
  };

  const tapRate = summary.bioViews > 0 ? (summary.bioClicks / summary.bioViews) * 100 : 0;
  const previousTapRate =
    summary.previousBioViews > 0 ? (summary.previousBioClicks / summary.previousBioViews) * 100 : 0;
  const rateText = (value: number) => `${value < 10 ? value.toFixed(1) : Math.round(value)}%`;

  const blocksById = new Map(page.blocks.map((block) => [block.id, block]));
  const topBlocks = blockRows.map((row) => {
    const block = blocksById.get(row.key);
    const label = !block
      ? t("statsPage.removedBlock")
      : block.type === "link"
        ? block.label
        : block.type === "social"
          ? t("block.social")
          : block.type === "image"
            ? block.alt || t("block.image")
            : t(`block.${block.type}`);
    return {
      key: row.key,
      label,
      value: row.clicks,
      badge: <Icon name={block ? BLOCK_ICONS[block.type] : "link"} className="text-xs" />,
    };
  });

  return (
    <PanelShell
      title={ts("statistics")}
      crumbs={[
        { label: context.workspace.name },
        { label: t("title"), href: "/bio" },
        { label: page.displayName, href: `/bio/${page.id}/edit` },
      ]}
      contentClassName="gap-8"
    >
      <PageHeader
        back={{ href: `/bio/${page.id}/edit`, label: page.displayName }}
        title={t("statsPage.title")}
        meta={<BioStatusBadge status={status} />}
        description={
          <a href={url} target="_blank" rel="noreferrer" className="font-mono text-[13px]">
            {page.hostname}/{page.handle}
          </a>
        }
        secondaryActions={
          <>
            <BotsToggle />
            <RangePicker value={range.key} />
          </>
        }
        actions={<ExportButtons href={exportHref} />}
      />

      <div className="flex min-w-0 flex-col gap-6">
        <Grid columns={4}>
          <StatCard
            icon="eye"
            label={t("statsPage.views")}
            info={t("statsPage.viewsInfo")}
            value={formatNumber(summary.bioViews)}
            delta={deltaText(summary.bioViews, summary.previousBioViews)}
            trend={range.comparePrevious ? trendOf(summary.bioViews, summary.previousBioViews) : "neutral"}
            deltaLabel={comparison}
          />
          <StatCard
            icon="arrow-pointer"
            label={t("statsPage.taps")}
            info={t("statsPage.tapsInfo")}
            value={formatNumber(summary.bioClicks)}
            delta={deltaText(summary.bioClicks, summary.previousBioClicks)}
            trend={range.comparePrevious ? trendOf(summary.bioClicks, summary.previousBioClicks) : "neutral"}
            deltaLabel={comparison}
          />
          <StatCard
            icon="bullseye"
            label={t("statsPage.tapRate")}
            info={t("statsPage.tapRateInfo")}
            value={summary.bioViews > 0 ? rateText(tapRate) : "—"}
            delta={
              range.comparePrevious && summary.previousBioViews > 0 && summary.bioViews > 0
                ? `${Math.abs(Math.round(tapRate - previousTapRate))} ${t("statsPage.points")}`
                : undefined
            }
            trend={
              range.comparePrevious && summary.previousBioViews > 0 && summary.bioViews > 0
                ? Math.round(tapRate - previousTapRate) === 0
                  ? "neutral"
                  : tapRate > previousTapRate
                    ? "up"
                    : "down"
                : "neutral"
            }
            deltaLabel={summary.bioViews > 0 ? comparison : t("statsPage.noViewsYet")}
          />
          <StatCard
            icon="users"
            label={t("statsPage.visitors")}
            info={t("statsPage.visitorsInfo")}
            value={formatNumber(summary.visitors)}
            delta={deltaText(summary.visitors, summary.previousVisitors)}
            trend={range.comparePrevious ? trendOf(summary.visitors, summary.previousVisitors) : "neutral"}
            deltaLabel={comparison}
          />
        </Grid>

        <Card
          title={
            <span className="inline-flex items-center gap-1.5">
              {t("statsPage.activity")}
              <InfoTip label={t("statsPage.activity")}>{t("statsPage.activityInfo")}</InfoTip>
            </span>
          }
          description={
            range.granularity === "hour" ? t("statsPage.activityHour") : t("statsPage.activityDay")
          }
        >
          {hasTraffic ? (
            <TimeseriesChart data={series} granularity={range.granularity} />
          ) : (
            <EmptyState
              bare
              size="sm"
              tone={status === "live" ? "default" : "first-run"}
              icon="chart-line"
              title={status === "live" ? t("statsPage.emptyTitle") : t("statsPage.notLiveTitle")}
              description={status === "live" ? t("statsPage.emptyBody") : t("statsPage.notLiveBody")}
              actions={
                status === "live" ? null : (
                  <Button variant="primary" leadingIcon="pen" href={`/bio/${page.id}/edit`}>
                    {t("statsPage.openBuilder")}
                  </Button>
                )
              }
            />
          )}
        </Card>
      </div>

      {hasTraffic ? (
        <>
          <Grid columns={2}>
            <BreakdownList
              title={t("statsPage.topBlocks")}
              rows={topBlocks}
              emptyLabel={t("statsPage.noTaps")}
            />
            <BreakdownList
              title={t("statsPage.topSources")}
              rows={breakdowns.referrer.map((row) => ({
                key: row.key,
                label: row.key === "unknown" ? ts("direct") : row.key,
                value: row.clicks,
              }))}
              limit={8}
              emptyLabel={t("statsPage.noSources")}
            />
          </Grid>
          <StatsBreakdowns data={breakdowns} />
          <Card
            padding="none"
            title={t("statsPage.recent")}
            description={t("statsPage.recentDesc")}
          >
            <div className="px-5 pb-5">
              <RecentEventsTable events={recent} />
            </div>
          </Card>
        </>
      ) : null}
    </PanelShell>
  );
}

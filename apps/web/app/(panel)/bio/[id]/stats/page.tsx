import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { RecentEventsTable } from "@/app/(panel)/analytics/recent-events-table";
import { StatsToolbar } from "@/app/(panel)/analytics/stats-toolbar";
import { StatsBreakdowns } from "@/components/charts/stats-breakdowns";
import { TimeseriesChart } from "@/components/charts/timeseries-chart";
import { PanelShell } from "@/components/shell/panel-shell";
import { Button, Card, CopyButton, EmptyState, Grid, Hero } from "@/components/ui";
import { loadBreakdownSet, loadRecentEvents, loadSummary, loadTimeseries } from "@/lib/analytics";
import { bioUrl, getBiopage } from "@/lib/biopages";
import { formatNumber } from "@/lib/format";
import { requireWorkspace } from "@/lib/session";
import {
  clampRangeToRetention,
  deltaPercent,
  formatDelta,
  localizedRangeLabel,
  resolveRange,
} from "@/lib/stats";

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

export default async function BioStatsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const context = await requireWorkspace();
  const { id } = await params;
  const raw = await searchParams;
  const locale = await getLocale();
  const range = clampRangeToRetention(
    resolveRange(raw.range, raw.from, raw.to, locale),
    context.plan.limits.retentionDays,
  );
  const includeBots = Array.isArray(raw.includeBots) ? raw.includeBots[0] === "1" : raw.includeBots === "1";

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

  const exportHref = `/api/analytics/export?biopageId=${page.id}&range=${range.key}${includeBots ? "&includeBots=1" : ""}`;
  const url = bioUrl(page.hostname, page.handle);

  const [summary, series, breakdowns, recent, t, tc, ts, tn, tp] = await Promise.all([
    loadSummary(scope),
    loadTimeseries(scope, range.granularity),
    loadBreakdownSet(scope),
    loadRecentEvents(scope, 50),
    getTranslations("bio"),
    getTranslations("common"),
    getTranslations("stats"),
    getTranslations("nav"),
    getTranslations("panel"),
  ]);

  const rangeLabel = localizedRangeLabel(range, ts);
  const noneDelta = ts("deltaNone");
  const hasTraffic = summary.bioViews > 0 || summary.bioClicks > 0 || series.length > 0;

  return (
    <PanelShell
      title={ts("statistics")}
      crumbs={[
        { label: context.workspace.name },
        { label: tn("bio"), href: "/bio" },
        { label: page.displayName, href: `/bio/${page.id}/edit` },
      ]}
      topbarActions={
        <Button href={`/bio/${page.id}/edit`}>
          <Icon name="pen" className="text-sm" />
          {tc("edit")}
        </Button>
      }
      contentClassName="gap-8"
    >
      <Hero
        variant="compact"
        eyebrow={ts("rangeEyebrowAll", { range: rangeLabel })}
        title={page.displayName}
        description={
          <Link href={url} target="_blank" rel="noreferrer" className="w-fit font-mono text-xs text-accent-ink">
            {url}
          </Link>
        }
      />

      <StatsToolbar
        range={range.key}
        exportHref={exportHref}
        leading={<CopyButton value={url} label={tc("copy")} />}
      />

      {hasTraffic ? (
        <>
          <Grid columns={4}>
            <Card
              className="bg-surface"
              icon={<Icon name="eye" className="text-sm" />}
              label={ts("bioViews")}
              value={formatNumber(summary.bioViews)}
              trend={trendOf(summary.bioViews, summary.previousBioViews)}
              delta={
                range.comparePrevious
                  ? formatDelta(summary.bioViews, summary.previousBioViews, noneDelta)
                  : rangeLabel
              }
            />
            <Card
              className="bg-surface"
              icon={<Icon name="arrow-pointer" className="text-sm" />}
              label={ts("bioClicks")}
              value={formatNumber(summary.bioClicks)}
            />
            <Card
              className="bg-surface"
              icon={<Icon name="users" className="text-sm" />}
              label={tp("uniqueVisitors")}
              value={formatNumber(summary.visitors)}
              trend={trendOf(summary.visitors, summary.previousVisitors)}
              delta={
                range.comparePrevious
                  ? formatDelta(summary.visitors, summary.previousVisitors, noneDelta)
                  : rangeLabel
              }
            />
            <Card
              className="bg-surface"
              icon={<Icon name="layer-group" className="text-sm" />}
              label={t("blocksCount", { count: page.blocks.length })}
              value={formatNumber(page.blocks.length)}
            />
          </Grid>

          <TimeseriesChart data={series} granularity={range.granularity} />
          <StatsBreakdowns data={breakdowns} />
          <RecentEventsTable events={recent} />
        </>
      ) : (
        <EmptyState
          icon={<Icon name="chart-line" className="text-lg" />}
          title={ts("noLinkTraffic")}
          description={ts("noLinkTrafficBody")}
        />
      )}
    </PanelShell>
  );
}

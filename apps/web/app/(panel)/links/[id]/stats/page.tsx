import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { RangePicker } from "@/components/charts/range-picker";
import { StatsBreakdowns } from "@/components/charts/stats-breakdowns";
import { TimeseriesChart } from "@/components/charts/timeseries-chart";
import { PanelShell } from "@/components/shell/panel-shell";
import {
  Button,
  Card,
  CopyButton,
  EmptyState,
  Grid,
  Hero,
  Section,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { loadBreakdownSet, loadRecentEvents, loadSummary, loadTimeseries } from "@/lib/analytics";
import { formatDateTime, formatNumber, parseClickhouseDate, truncateMiddle } from "@/lib/format";
import { getLink, shortUrl } from "@/lib/links";
import { requireWorkspace } from "@/lib/session";
import {
  countryName,
  deltaPercent,
  formatDelta,
  localizedRangeLabel,
  resolveRange,
  titleCase,
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

export default async function LinkStatsPage({
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
  const range = resolveRange(raw.range, raw.from, raw.to, locale);

  const link = await getLink(context.workspace.id, id);
  if (!link) {
    notFound();
  }

  const scope = {
    workspaceId: context.workspace.id,
    linkId: link.id,
    from: range.from,
    to: range.to,
  };

  const [summary, series, breakdowns, recent, t, tc, ts, tn] = await Promise.all([
    loadSummary(scope),
    loadTimeseries(scope, range.granularity),
    loadBreakdownSet(scope),
    loadRecentEvents(scope, 25),
    getTranslations("panel"),
    getTranslations("common"),
    getTranslations("stats"),
    getTranslations("nav"),
  ]);

  const rangeLabel = localizedRangeLabel(range, ts);
  const noneDelta = ts("deltaNone");
  const unknown = ts("unknown");
  const granularityLabel = range.granularity === "hour" ? ts("hour") : ts("day");

  const url = shortUrl(link.hostname, link.slug);
  const returning = summary.clicks - summary.visitors;
  const hasTraffic = summary.clicks > 0 || series.length > 0;
  const peakClicks = series.reduce((acc, point) => Math.max(acc, point.clicks), 0);
  const singleBucket = series.length === 1;

  return (
    <PanelShell
      title={ts("statistics")}
      crumbs={[
        { label: context.workspace.name },
        { label: tn("links"), href: "/links" },
        { label: `${link.hostname}/${link.slug}`, href: `/links/${link.id}` },
      ]}
      topbarActions={
        <Button href={`/links/${link.id}`}>
          <Icon name="pen" className="text-sm" />
          {t("editLink")}
        </Button>
      }
    >
      <Hero
        variant="compact"
        eyebrow={
          range.comparePrevious
            ? ts("lastRange", { range: rangeLabel })
            : ts("rangeEyebrowAll", { range: rangeLabel })
        }
        title={`${link.hostname}/${link.slug}`}
        description={
          <span className="flex flex-col gap-1">
            <span className="truncate">{link.title || truncateMiddle(link.destination, 72)}</span>
            <Link
              href={url}
              target="_blank"
              rel="noreferrer"
              className="w-fit font-mono text-xs text-accent-ink"
            >
              {url}
            </Link>
          </span>
        }
        actions={
          <>
            <CopyButton value={url} label={tc("copy")} />
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
                  <span className="text-fg-subtle">{ts("vsPreviousPeriod")}</span>
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
                  <span className="text-fg-subtle">{ts("vsPreviousPeriod")}</span>
                </>
              ) : (
                <span className="text-fg-subtle">{rangeLabel}</span>
              )}
            </>
          }
        />
        <Card
          icon={<Icon name="repeat" className="text-sm" />}
          label={ts("repeatClicks")}
          value={formatNumber(Math.max(returning, 0))}
          delta={ts("repeatClicksDelta")}
        />
        <Card
          icon={<Icon name="earth" className="text-sm" />}
          label={ts("countries")}
          value={formatNumber(summary.countries)}
          delta={ts("distinctCountries")}
        />
      </Grid>

      <Section
        title={t("clickTrend")}
        description={range.granularity === "hour" ? t("clickTrendDescHour") : t("clickTrendDescDay")}
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
              icon={<Icon name="chart-line" className="text-sm" />}
              title={t("noClicksRange")}
              description={ts("noClicksLinkBody")}
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
              <TimeseriesChart data={series} granularity={range.granularity} />
            </>
          )}
        </Card>
      </Section>

      <Section title={ts("breakdown")} description={ts("breakdownLinkDesc")}>
        {hasTraffic ? (
          <StatsBreakdowns data={breakdowns} />
        ) : (
          <EmptyState
            size="sm"
            icon={<Icon name="earth" className="text-sm" />}
            title={ts("nothingToBreakDown")}
            description={ts("nothingToBreakDownLinkBody")}
          />
        )}
      </Section>

      <Section
        title={ts("recentClicks")}
        description={ts("recentClicksDesc")}
        meta={
          recent.length > 0 ? (
            <span className="numeric font-mono">{ts("eventsCount", { count: recent.length })}</span>
          ) : null
        }
      >
        {recent.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Icon name="arrow-pointer" className="text-sm" />}
            title={ts("nothingRecorded")}
            description={ts("nothingRecordedBody")}
          />
        ) : (
          <Table stickyHeader density="compact" label={ts("recentEventsTable")}>
            <TableHead sticky>
              <TableRow>
                <TableHeaderCell className="w-40">{ts("when")}</TableHeaderCell>
                <TableHeaderCell className="w-48">{ts("location")}</TableHeaderCell>
                <TableHeaderCell className="w-56">{ts("device")}</TableHeaderCell>
                <TableHeaderCell className="w-40">{ts("referrer")}</TableHeaderCell>
                <TableHeaderCell>{ts("destination")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recent.map((event, index) => (
                <TableRow key={`${event.ts}-${index}`}>
                  <TableCell className="numeric font-mono text-xs whitespace-nowrap text-fg-muted">
                    {formatDateTime(parseClickhouseDate(event.ts))}
                  </TableCell>
                  <TableCell truncate>
                    {countryName(event.country, locale, unknown)}
                    {event.city ? ` · ${event.city}` : ""}
                  </TableCell>
                  <TableCell truncate className="text-fg-muted">
                    {titleCase(event.device, unknown)} · {titleCase(event.os, unknown)} ·{" "}
                    {titleCase(event.browser, unknown)}
                  </TableCell>
                  <TableCell truncate className="text-fg-muted">
                    {event.referrerDomain === "" ? ts("direct") : event.referrerDomain}
                  </TableCell>
                  <TableCell truncate className="font-mono text-xs text-fg-subtle">
                    {truncateMiddle(event.destination, 40)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </PanelShell>
  );
}

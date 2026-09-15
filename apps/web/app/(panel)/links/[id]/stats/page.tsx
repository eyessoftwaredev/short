import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BarChart3,
  Globe2,
  MousePointerClick,
  Pencil,
  Repeat2,
  Users,
} from "lucide-react";
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
import { countryName, deltaPercent, formatDelta, resolveRange, titleCase } from "@/lib/stats";

export const metadata: Metadata = { title: "Link statistics" };

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
  const range = resolveRange(raw.range);

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

  const [summary, series, breakdowns, recent] = await Promise.all([
    loadSummary(scope),
    loadTimeseries(scope, range.granularity),
    loadBreakdownSet(scope),
    loadRecentEvents(scope, 25),
  ]);

  const url = shortUrl(link.hostname, link.slug);
  const returning = summary.clicks - summary.visitors;
  const hasTraffic = summary.clicks > 0 || series.length > 0;
  const peakClicks = series.reduce((acc, point) => Math.max(acc, point.clicks), 0);
  const singleBucket = series.length === 1;

  return (
    <PanelShell
      title="Statistics"
      crumbs={[
        { label: context.workspace.name },
        { label: "Links", href: "/links" },
        { label: `${link.hostname}/${link.slug}`, href: `/links/${link.id}` },
      ]}
      topbarActions={
        <Button href={`/links/${link.id}`}>
          <Pencil className="size-4" />
          Edit link
        </Button>
      }
    >
      <Hero
        variant="compact"
        eyebrow={`Last ${range.label}`}
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
            <CopyButton value={url} label="Copy link" />
            <RangePicker value={range.key} />
          </>
        }
      />

      <Grid columns={4}>
        <Card
          icon={<MousePointerClick className="size-4" />}
          label="Clicks"
          value={formatNumber(summary.clicks)}
          trend={trendOf(summary.clicks, summary.previousClicks)}
          delta={
            <>
              {formatDelta(summary.clicks, summary.previousClicks)}{" "}
              <span className="text-fg-subtle">vs previous period</span>
            </>
          }
        />
        <Card
          icon={<Users className="size-4" />}
          label="Unique visitors"
          value={formatNumber(summary.visitors)}
          trend={trendOf(summary.visitors, summary.previousVisitors)}
          delta={
            <>
              {formatDelta(summary.visitors, summary.previousVisitors)}{" "}
              <span className="text-fg-subtle">vs previous period</span>
            </>
          }
        />
        <Card
          icon={<Repeat2 className="size-4" />}
          label="Repeat clicks"
          value={formatNumber(Math.max(returning, 0))}
          delta="clicks beyond the first per visitor"
        />
        <Card
          icon={<Globe2 className="size-4" />}
          label="Countries"
          value={formatNumber(summary.countries)}
          delta="distinct countries"
        />
      </Grid>

      <Section
        title="Click trend"
        description={`${range.granularity === "hour" ? "Hourly" : "Daily"} clicks and unique visitors.`}
        meta={
          series.length > 0 ? (
            <span className="numeric font-mono">
              peak {formatNumber(peakClicks)} / {range.granularity}
            </span>
          ) : null
        }
      >
        <Card staticHover>
          {series.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<BarChart3 className="size-4" />}
              title="No clicks in this range"
              description="This link has not been opened between these dates. Try a wider range."
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-4 text-xs text-fg-muted">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-pill bg-chart-1" aria-hidden="true" />
                  Clicks
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-pill bg-chart-2" aria-hidden="true" />
                  Unique visitors
                </span>
                {singleBucket ? (
                  <span className="ml-auto text-fg-subtle">
                    Only one {range.granularity} of data in this range.
                  </span>
                ) : null}
              </div>
              <TimeseriesChart data={series} granularity={range.granularity} />
            </>
          )}
        </Card>
      </Section>

      <Section title="Breakdown" description="Where the traffic comes from and what it runs on.">
        {hasTraffic ? (
          <StatsBreakdowns data={breakdowns} />
        ) : (
          <EmptyState
            size="sm"
            icon={<Globe2 className="size-4" />}
            title="Nothing to break down yet"
            description="Country, device and referrer splits appear after this link's first click."
          />
        )}
      </Section>

      <Section
        title="Recent clicks"
        description="Last 25 events for this link."
        meta={
          recent.length > 0 ? (
            <span className="numeric font-mono">{recent.length} events</span>
          ) : null
        }
      >
        {recent.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<MousePointerClick className="size-4" />}
            title="Nothing recorded yet"
            description="Individual click events show up here within seconds of the first visit."
          />
        ) : (
          // 25 rows of five columns is exactly the case density is for: the
          // whole event log should be scannable without scrolling twice.
          <Table stickyHeader density="compact" label="Recent click events">
            <TableHead sticky>
              <TableRow>
                <TableHeaderCell className="w-40">When</TableHeaderCell>
                <TableHeaderCell className="w-48">Location</TableHeaderCell>
                <TableHeaderCell className="w-56">Device</TableHeaderCell>
                <TableHeaderCell className="w-40">Referrer</TableHeaderCell>
                <TableHeaderCell>Destination</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recent.map((event, index) => (
                <TableRow key={`${event.ts}-${index}`}>
                  <TableCell className="numeric font-mono text-xs whitespace-nowrap text-fg-muted">
                    {formatDateTime(parseClickhouseDate(event.ts))}
                  </TableCell>
                  <TableCell truncate>
                    {countryName(event.country)}
                    {event.city ? ` · ${event.city}` : ""}
                  </TableCell>
                  <TableCell truncate className="text-fg-muted">
                    {titleCase(event.device)} · {titleCase(event.os)} · {titleCase(event.browser)}
                  </TableCell>
                  <TableCell truncate className="text-fg-muted">
                    {event.referrerDomain === "" ? "Direct" : event.referrerDomain}
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

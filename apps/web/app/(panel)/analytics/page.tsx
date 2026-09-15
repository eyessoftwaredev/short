import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Globe2, MousePointerClick, Plus, Repeat2, Users } from "lucide-react";
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
import { deltaPercent, formatDelta, resolveRange } from "@/lib/stats";

export const metadata: Metadata = { title: "Analytics" };

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
  const range = resolveRange(raw.range);

  const scope = { workspaceId: context.workspace.id, from: range.from, to: range.to };

  const [summary, series, breakdowns, topLinks] = await Promise.all([
    loadSummary(scope),
    loadTimeseries(scope, range.granularity),
    loadBreakdownSet(scope, 12),
    loadTopLinks(scope, 15),
  ]);

  const retentionNote =
    context.plan.limits.retentionDays === -1
      ? "Unlimited retention"
      : `${context.plan.limits.retentionDays} day retention on ${context.plan.name}`;

  const hasTraffic = summary.clicks > 0 || series.length > 0;
  const peakClicks = series.reduce((acc, point) => Math.max(acc, point.clicks), 0);
  // One bucket draws no line, so the chart is labelled rather than left looking broken.
  const singleBucket = series.length === 1;

  return (
    <PanelShell title="Analytics" crumbs={[{ label: context.workspace.name }]}>
      <Hero
        variant="compact"
        eyebrow={retentionNote}
        title="Workspace analytics"
        description={`Every link, QR code and bio page in ${context.workspace.name}, over the last ${range.label}.`}
        actions={<RangePicker value={range.key} />}
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
              <span className="text-fg-subtle">vs previous {range.label}</span>
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
              <span className="text-fg-subtle">vs previous {range.label}</span>
            </>
          }
        />
        <Card
          icon={<Repeat2 className="size-4" />}
          label="Clicks per visitor"
          value={summary.visitors === 0 ? "0.0" : (summary.clicks / summary.visitors).toFixed(1)}
          delta="average in range"
        />
        <Card
          icon={<Globe2 className="size-4" />}
          label="Countries"
          value={formatNumber(summary.countries)}
          delta="distinct countries"
        />
      </Grid>

      <Section
        title="Traffic over time"
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
              tone="first-run"
              icon={<BarChart3 className="size-4" />}
              title="No clicks in this range"
              description="Pick a wider range, or share a link to start collecting data."
              actions={
                <Button variant="primary" href="/links/new">
                  <Plus className="size-4" />
                  New link
                </Button>
              }
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
              <TimeseriesChart data={series} granularity={range.granularity} height={300} />
            </>
          )}
        </Card>
      </Section>

      <Section
        title="Breakdown"
        description="Audience, platform and acquisition detail."
        headingLevel={2}
      >
        {hasTraffic ? (
          <StatsBreakdowns data={breakdowns} />
        ) : (
          <EmptyState
            size="sm"
            icon={<Globe2 className="size-4" />}
            title="Nothing to break down yet"
            description="Country, device and referrer splits appear once this workspace records its first click."
          />
        )}
      </Section>

      <Section
        title="Top links"
        description="Ranked by clicks in the selected range."
        meta={
          topLinks.length > 0 ? (
            <span className="numeric font-mono">{topLinks.length} shown</span>
          ) : null
        }
      >
        {topLinks.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<BarChart3 className="size-4" />}
            title="No link traffic in this range"
            description="Links that were clicked between these dates will be ranked here."
          />
        ) : (
          <Table label="Top links by clicks">
            <TableHead>
              <TableRow>
                <TableHeaderCell numeric className="w-12">
                  #
                </TableHeaderCell>
                <TableHeaderCell>Link</TableHeaderCell>
                <TableHeaderCell numeric className="w-28">
                  Clicks
                </TableHeaderCell>
                <TableHeaderCell numeric className="w-28">
                  Visitors
                </TableHeaderCell>
                {/* The bar makes the long tail legible at a glance; the figure
                    beside it keeps the exact value available. */}
                <TableHeaderCell className="w-44">Share of clicks</TableHeaderCell>
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

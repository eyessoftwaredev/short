import type { Metadata } from "next";
import { isWithinLimit } from "@short/core";
import Link from "next/link";
import { BarChart3, Globe2, Link2, MousePointerClick, Plus, Users } from "lucide-react";
import { RangePicker } from "@/components/charts/range-picker";
import { TimeseriesChart } from "@/components/charts/timeseries-chart";
import { PanelShell } from "@/components/shell/panel-shell";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Grid,
  Hero,
  QuotaMeter,
  Section,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { loadRecentEvents, loadSummary, loadTimeseries, loadTopLinks } from "@/lib/analytics";
import { formatDateTime, formatNumber, parseClickhouseDate, truncateMiddle } from "@/lib/format";
import { cn } from "@/lib/cx";
import { getWorkspaceUsage } from "@/lib/quota";
import { requireWorkspace } from "@/lib/session";
import { countryName, deltaPercent, formatDelta, resolveRange, titleCase } from "@/lib/stats";

export const metadata: Metadata = { title: "Dashboard" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * More clicks is good news, fewer is bad. Deliberately not applied to counts
 * like "countries reached", where a movement has no inherent direction.
 */
function trendOf(current: number, previous: number): "up" | "down" | "neutral" {
  const delta = deltaPercent(current, previous);
  if (delta === 0) {
    return "neutral";
  }
  return delta > 0 ? "up" : "down";
}

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const context = await requireWorkspace();
  const raw = await searchParams;
  const range = resolveRange(raw.range);

  const scope = { workspaceId: context.workspace.id, from: range.from, to: range.to };

  const [summary, series, topLinks, recent, usage] = await Promise.all([
    loadSummary(scope),
    loadTimeseries(scope, range.granularity),
    loadTopLinks(scope, 8),
    loadRecentEvents(scope, 8),
    getWorkspaceUsage(context.workspace.id),
  ]);

  const linkLimit = context.plan.limits.links;
  const overQuota = !isWithinLimit(linkLimit, usage.links);
  const nearQuota =
    !overQuota && linkLimit !== -1 && usage.links / Math.max(linkLimit, 1) >= 0.85;
  const hasLinks = usage.links > 0;
  const peakClicks = series.reduce((acc, point) => Math.max(acc, point.clicks), 0);

  return (
    <PanelShell
      title="Dashboard"
      crumbs={[{ label: context.workspace.name }]}
      topbarActions={
        <Button variant="primary" size="sm" href="/links/new">
          <Plus className="size-4" />
          New link
        </Button>
      }
    >
      <Hero
        variant="compact"
        eyebrow={`${context.plan.name} plan`}
        title={context.workspace.name}
        description={`Clicks, visitors and destinations across the last ${range.label}.`}
        actions={<RangePicker value={range.key} />}
      />

      {/*
        Hitting the plan ceiling silently fails the next "New link" click, so
        it is surfaced at the top of the workspace's home screen rather than
        discovered at the point of failure.
      */}
      {overQuota || nearQuota ? (
        <div
          role="status"
          className={cn(
            "flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-default border px-4 py-3",
            overQuota
              ? "border-danger-border bg-danger-surface text-danger"
              : "border-warn-border bg-warn-surface text-warn-ink",
          )}
        >
          <span className="min-w-0 text-sm">
            {overQuota
              ? `You have used all ${formatNumber(linkLimit)} links on the ${context.plan.name} plan. Archive a link or upgrade to create more.`
              : `You are close to the ${formatNumber(linkLimit)} link limit on the ${context.plan.name} plan.`}
          </span>
          <Button size="sm" href="/billing">
            View plans
          </Button>
        </div>
      ) : null}

      <Grid columns={4}>
        <Card
          icon={<MousePointerClick className="size-4" />}
          label="Clicks"
          value={formatNumber(summary.clicks)}
          trend={trendOf(summary.clicks, summary.previousClicks)}
          href="/analytics"
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
          href="/analytics"
          delta={
            <>
              {formatDelta(summary.visitors, summary.previousVisitors)}{" "}
              <span className="text-fg-subtle">vs previous {range.label}</span>
            </>
          }
        />
        <Card
          icon={<Globe2 className="size-4" />}
          label="Countries"
          value={formatNumber(summary.countries)}
          delta="reached in this range"
        />
        <Card staticHover icon={<Link2 className="size-4" />} label="Links">
          <QuotaMeter label="Links used" used={usage.links} limit={linkLimit} />
        </Card>
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
        actions={
          <Link href="/analytics" className="text-sm text-accent-ink">
            Full analytics
          </Link>
        }
      >
        <Card staticHover>
          {series.length === 0 ? (
            <EmptyState
              size="sm"
              tone={hasLinks ? "default" : "first-run"}
              icon={<BarChart3 className="size-4" />}
              title={hasLinks ? "No clicks in this range" : "No clicks yet"}
              description={
                hasLinks
                  ? "Nothing was recorded between these dates. Try a wider range."
                  : "Create a short link and share it — the first click shows up here within seconds."
              }
              actions={
                hasLinks ? null : (
                  <Button variant="primary" href="/links/new">
                    <Plus className="size-4" />
                    Create your first link
                  </Button>
                )
              }
            />
          ) : (
            <>
              {/*
                Recharts' own legend is positioned inside the plot and pushes the
                axis around; a static one keeps the plot area stable.
              */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-fg-muted">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-pill bg-chart-1" aria-hidden="true" />
                  Clicks
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-pill bg-chart-2" aria-hidden="true" />
                  Unique visitors
                </span>
              </div>
              <TimeseriesChart data={series} granularity={range.granularity} />
            </>
          )}
        </Card>
      </Section>

      <Grid columns={2}>
        <Section
          title="Top links"
          description="Ranked by clicks in the selected range."
          actions={
            <Link href="/analytics" className="text-sm text-accent-ink">
              All analytics
            </Link>
          }
        >
          {topLinks.length === 0 ? (
            <EmptyState
              size="sm"
              tone={hasLinks ? "default" : "first-run"}
              icon={<Link2 className="size-4" />}
              title={hasLinks ? "No traffic yet" : "No links yet"}
              description={
                hasLinks
                  ? "Your links have not been clicked in this range."
                  : "Short links, QR codes and bio pages all report here once they start collecting clicks."
              }
              actions={
                <Button variant="primary" href="/links/new">
                  <Plus className="size-4" />
                  {hasLinks ? "New link" : "Create a link"}
                </Button>
              }
            />
          ) : (
            <Table density="compact" label="Top links by clicks">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Link</TableHeaderCell>
                  <TableHeaderCell numeric>Clicks</TableHeaderCell>
                  <TableHeaderCell numeric>Visitors</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topLinks.map((row) => (
                  <TableRow key={row.linkId}>
                    <TableCell truncate>
                      <Link
                        href={`/links/${row.linkId}/stats`}
                        className="truncate font-mono text-sm text-ink no-underline hover:text-accent-ink"
                      >
                        {row.hostname}/{row.slug}
                      </Link>
                    </TableCell>
                    <TableCell numeric>{formatNumber(row.clicks)}</TableCell>
                    <TableCell numeric className="text-fg-muted">
                      {formatNumber(row.visitors)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>

        <Section
          title="Latest clicks"
          description="Most recent events, newest first."
          meta={recent.length > 0 ? <Badge tone="accent" dot>Live</Badge> : null}
        >
          {recent.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<MousePointerClick className="size-4" />}
              title="Nothing yet"
              description="Events appear here within seconds of the first click."
            />
          ) : (
            <ol className="m-0 flex list-none flex-col gap-3.5 rounded-default border border-border bg-bg p-5">
              {recent.map((event) => (
                <li key={`${event.ts}-${event.destination}`} className="flex min-w-0 gap-3">
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-pill bg-accent"
                    aria-hidden="true"
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm">
                      {countryName(event.country)}
                      {event.city ? ` · ${event.city}` : ""} · {titleCase(event.device)} ·{" "}
                      {titleCase(event.browser)}
                    </span>
                    <span className="truncate font-mono text-xs text-fg-subtle">
                      {formatDateTime(parseClickhouseDate(event.ts))} ·{" "}
                      {truncateMiddle(event.destination, 40)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Section>
      </Grid>
    </PanelShell>
  );
}

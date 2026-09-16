import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import { isWithinLimit } from "@short/core";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
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
import { readDraftDestination } from "@/lib/draft-link";
import {
  countryName,
  deltaPercent,
  formatDelta,
  localizedRangeLabel,
  resolveRange,
  titleCase,
} from "@/lib/stats";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("panel");
  return { title: t("dashboard") };
}

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
  const locale = await getLocale();
  const range = resolveRange(raw.range, raw.from, raw.to, locale);

  const scope = { workspaceId: context.workspace.id, from: range.from, to: range.to };

  const [summary, series, topLinks, recent, usage, draft, t, tc, ts] = await Promise.all([
    loadSummary(scope),
    loadTimeseries(scope, range.granularity),
    loadTopLinks(scope, 8),
    loadRecentEvents(scope, 8),
    getWorkspaceUsage(context.workspace.id),
    readDraftDestination(),
    getTranslations("panel"),
    getTranslations("common"),
    getTranslations("stats"),
  ]);
  const rangeLabel = localizedRangeLabel(range, ts);
  const unknown = ts("unknown");
  const noneDelta = ts("deltaNone");

  const linkLimit = context.plan.limits.links;
  const overQuota = !isWithinLimit(linkLimit, usage.links);
  const nearQuota =
    !overQuota && linkLimit !== -1 && usage.links / Math.max(linkLimit, 1) >= 0.85;
  const hasLinks = usage.links > 0;
  if (!hasLinks && draft) {
    redirect("/links/new");
  }
  const peakClicks = series.reduce((acc, point) => Math.max(acc, point.clicks), 0);

  return (
    <PanelShell
      title={t("dashboard")}
      crumbs={[{ label: context.workspace.name }]}
      topbarActions={
        <Button variant="primary" size="sm" href="/links/new">
          <Icon name="plus" className="text-sm" />
          {tc("newLink")}
        </Button>
      }
    >
      <Hero
        variant="compact"
        eyebrow={t("planLabel", { name: context.plan.name })}
        title={context.workspace.name}
        description={
          range.comparePrevious
            ? t("dashboardDesc", { range: rangeLabel })
            : t("dashboardDescAll", { range: rangeLabel })
        }
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
              ? t("quotaOver", { limit: formatNumber(linkLimit), plan: context.plan.name })
              : t("quotaNear", { limit: formatNumber(linkLimit), plan: context.plan.name })}
          </span>
          <Button size="sm" href="/billing">
            {t("viewPlans")}
          </Button>
        </div>
      ) : null}

      <Grid columns={4}>
        <Card
          icon={<Icon name="arrow-pointer" className="text-sm" />}
          label={ts("clicks")}
          value={formatNumber(summary.clicks)}
          trend={trendOf(summary.clicks, summary.previousClicks)}
          href="/analytics"
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
          href="/analytics"
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
          icon={<Icon name="earth" className="text-sm" />}
          label={ts("countries")}
          value={formatNumber(summary.countries)}
          delta={t("countriesReached")}
        />
        <Card staticHover icon={<Icon name="link" className="text-sm" />} label={t("link")}>
          <QuotaMeter label={t("linksUsed")} used={usage.links} limit={linkLimit} />
        </Card>
      </Grid>

      <Section
        title={t("clickTrend")}
        description={range.granularity === "hour" ? t("clickTrendDescHour") : t("clickTrendDescDay")}
        meta={
          series.length > 0 ? (
            <span className="numeric font-mono">
              {t("peak", { value: formatNumber(peakClicks), granularity: range.granularity })}
            </span>
          ) : null
        }
        actions={
          <Link href="/analytics" className="text-sm text-accent-ink">
            {t("fullAnalytics")}
          </Link>
        }
      >
        <Card staticHover>
          {series.length === 0 ? (
            <EmptyState
              size="sm"
              tone={hasLinks ? "default" : "first-run"}
              icon={<Icon name="chart-line" className="text-sm" />}
              title={hasLinks ? t("noClicksRange") : t("noClicksYet")}
              description={hasLinks ? t("noClicksRangeBody") : t("noClicksYetBody")}
              actions={
                hasLinks ? null : (
                  <Button variant="primary" href="/links/new">
                    <Icon name="plus" className="text-sm" />
                    {t("createFirstLink")}
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
                  {ts("clicks")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-pill bg-chart-2" aria-hidden="true" />
                  {t("uniqueVisitors")}
                </span>
              </div>
              <TimeseriesChart data={series} granularity={range.granularity} />
            </>
          )}
        </Card>
      </Section>

      <Grid columns={2}>
        <Section
          title={t("topLinks")}
          description={t("topLinksDesc")}
          actions={
            <Link href="/analytics" className="text-sm text-accent-ink">
              {t("allAnalytics")}
            </Link>
          }
        >
          {topLinks.length === 0 ? (
            <EmptyState
              size="sm"
              tone={hasLinks ? "default" : "first-run"}
              icon={<Icon name="link" className="text-sm" />}
              title={hasLinks ? t("noTraffic") : t("noLinks")}
              description={hasLinks ? t("noTrafficBody") : t("noLinksBody")}
              actions={
                <Button variant="primary" href="/links/new">
                  <Icon name="plus" className="text-sm" />
                  {hasLinks ? tc("newLink") : t("createALink")}
                </Button>
              }
            />
          ) : (
            <Table density="compact" label={t("topLinks")}>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("link")}</TableHeaderCell>
                  <TableHeaderCell numeric>{ts("clicks")}</TableHeaderCell>
                  <TableHeaderCell numeric>{ts("visitors")}</TableHeaderCell>
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
          title={t("latestClicks")}
          description={t("latestClicksDesc")}
          meta={recent.length > 0 ? <Badge tone="accent" dot>{t("live")}</Badge> : null}
        >
          {recent.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<Icon name="arrow-pointer" className="text-sm" />}
              title={t("nothingYet")}
              description={t("nothingYetBody")}
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
                      {countryName(event.country, locale, unknown)}
                      {event.city ? ` · ${event.city}` : ""} · {titleCase(event.device, unknown)} ·{" "}
                      {titleCase(event.browser, unknown)}
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

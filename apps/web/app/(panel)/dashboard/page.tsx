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
  Callout,
  Card,
  EmptyState,
  Grid,
  InfoTip,
  PageHeader,
  Progress,
  Sparkline,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { loadRecentEvents, loadSummary, loadTimeseries, loadTopLinks } from "@/lib/analytics";
import { formatDateTime, formatNumber, parseClickhouseDate, truncateMiddle } from "@/lib/format";
import { getWorkspaceUsage } from "@/lib/quota";
import { requireWorkspace } from "@/lib/session";
import { readDraftDestination } from "@/lib/draft-link";
import { GettingStartedCard } from "./getting-started-card";
import { loadGettingStarted } from "./getting-started";
import {
  clampRangeToRetention,
  countryName,
  deltaPercent,
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
  // Same retention clamp as /analytics, so the dashboard never shows data the plan hides.
  const range = clampRangeToRetention(
    resolveRange(raw.range, raw.from, raw.to, locale),
    context.plan.limits.retentionDays,
  );

  const scope = { workspaceId: context.workspace.id, from: range.from, to: range.to };

  const [summary, series, topLinks, recent, usage, draft, gettingStarted, t, tc, ts] =
    await Promise.all([
      loadSummary(scope),
      loadTimeseries(scope, range.granularity),
      loadTopLinks(scope, 8),
      loadRecentEvents(scope, 8),
      getWorkspaceUsage(context.workspace.id),
      readDraftDestination(),
      loadGettingStarted(context),
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

  /** Headline delta as a plain percentage; the StatCard draws the arrow. */
  const deltaText = (current: number, previous: number): string => {
    const delta = deltaPercent(current, previous);
    return delta === 0 ? noneDelta : `${Math.abs(delta)}%`;
  };
  const comparison = range.comparePrevious ? t("vsPrevious", { range: rangeLabel }) : rangeLabel;
  const trendDescription = range.granularity === "hour" ? t("clickTrendDescHour") : t("clickTrendDescDay");

  return (
    <PanelShell title={t("dashboard")} crumbs={[{ label: context.workspace.name }]}>
      {/*
        Reference layout for panel pages (see components/DESIGN.md):
        PageHeader → alerts → KPI row → primary chart → two-up detail cards.
      */}
      <PageHeader
        title={t("dashboard")}
        meta={<Badge tone="accent">{t("planLabel", { name: context.plan.name })}</Badge>}
        description={
          range.comparePrevious
            ? t("dashboardIntro", { range: rangeLabel })
            : t("dashboardIntroAll", { range: rangeLabel })
        }
        secondaryActions={<RangePicker value={range.key} />}
        actions={
          <Button variant="primary" leadingIcon="plus" href="/links/new">
            {tc("newLink")}
          </Button>
        }
      />

      {/*
        Hitting the plan ceiling silently fails the next "New link" click, so
        it is surfaced at the top of the workspace's home screen rather than
        discovered at the point of failure.
      */}
      {overQuota || nearQuota ? (
        <Callout
          tone={overQuota ? "danger" : "warn"}
          title={
            overQuota
              ? t("quotaOver", { limit: formatNumber(linkLimit), plan: context.plan.name })
              : t("quotaNear", { limit: formatNumber(linkLimit), plan: context.plan.name })
          }
          actions={
            <Button size="sm" href="/billing" leadingIcon="rocket">
              {t("viewPlans")}
            </Button>
          }
        />
      ) : null}

      {gettingStarted ? <GettingStartedCard steps={gettingStarted} /> : null}

      <Grid columns={4}>
        <StatCard
          icon="arrow-pointer"
          label={ts("clicks")}
          info={t("clicksInfo")}
          value={formatNumber(summary.clicks)}
          delta={range.comparePrevious ? deltaText(summary.clicks, summary.previousClicks) : undefined}
          trend={range.comparePrevious ? trendOf(summary.clicks, summary.previousClicks) : "neutral"}
          deltaLabel={comparison}
          href="/analytics"
          sparkline={
            series.length > 1 ? (
              <Sparkline data={series.map((point) => point.clicks)} tone="chart-1" />
            ) : null
          }
        />
        <StatCard
          icon="users"
          label={t("uniqueVisitors")}
          info={t("visitorsInfo")}
          value={formatNumber(summary.visitors)}
          delta={
            range.comparePrevious ? deltaText(summary.visitors, summary.previousVisitors) : undefined
          }
          trend={
            range.comparePrevious ? trendOf(summary.visitors, summary.previousVisitors) : "neutral"
          }
          deltaLabel={comparison}
          href="/analytics"
          sparkline={
            series.length > 1 ? (
              <Sparkline data={series.map((point) => point.visitors)} tone="chart-2" />
            ) : null
          }
        />
        <StatCard
          icon="earth"
          label={ts("countries")}
          info={t("countriesInfo")}
          value={formatNumber(summary.countries)}
          deltaLabel={t("countriesReached")}
        />
        <StatCard
          icon="link"
          label={t("linksUsed")}
          info={t("linksUsedInfo")}
          value={
            <>
              {formatNumber(usage.links)}
              <span className="text-base font-medium text-fg-subtle">
                {" / "}
                {linkLimit === -1 ? tc("unlimited") : formatNumber(linkLimit)}
              </span>
            </>
          }
        >
          {linkLimit === -1 ? null : (
            <Progress
              value={usage.links}
              max={Math.max(linkLimit, 1)}
              tone={overQuota ? "danger" : nearQuota ? "warn" : "accent"}
              size="sm"
              className="mt-auto"
            />
          )}
        </StatCard>
      </Grid>

      <Card
        title={
          <span className="inline-flex items-center gap-1.5">
            {t("clickTrend")}
            <InfoTip label={t("clickTrend")}>{t("clickTrendInfo")}</InfoTip>
          </span>
        }
        description={
          series.length > 0
            ? `${trendDescription} · ${t("peak", {
                value: formatNumber(peakClicks),
                granularity: range.granularity === "hour" ? ts("hour") : ts("day"),
              })}`
            : trendDescription
        }
        actions={
          <Button size="sm" variant="ghost" trailingIcon="arrow-right" href="/analytics">
            {t("fullAnalytics")}
          </Button>
        }
      >
        {series.length === 0 ? (
          <EmptyState
            bare
            size="sm"
            tone={hasLinks ? "default" : "first-run"}
            icon="chart-line"
            title={hasLinks ? t("noClicksRange") : t("noClicksYet")}
            description={hasLinks ? t("noClicksRangeBody") : t("noClicksYetBody")}
            actions={
              hasLinks ? null : (
                <Button variant="primary" leadingIcon="plus" href="/links/new">
                  {t("createFirstLink")}
                </Button>
              )
            }
          />
        ) : (
          <>
            {/*
              A static legend: Recharts' own legend sits inside the plot and
              pushes the axis around.
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

      <Grid columns={2}>
        <Card
          padding="none"
          title={t("topLinks")}
          description={t("topLinksDesc")}
          actions={
            <Button size="sm" variant="ghost" trailingIcon="arrow-right" href="/links">
              {tc("viewAll")}
            </Button>
          }
        >
          {topLinks.length === 0 ? (
            <EmptyState
              bare
              size="sm"
              tone={hasLinks ? "default" : "first-run"}
              icon="link"
              title={hasLinks ? t("noTraffic") : t("noLinks")}
              description={hasLinks ? t("noTrafficBody") : t("noLinksBody")}
              actions={
                <Button variant="primary" leadingIcon="plus" href="/links/new">
                  {hasLinks ? tc("newLink") : t("createALink")}
                </Button>
              }
            />
          ) : (
            <Table bare density="compact" label={t("topLinks")}>
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
                        className="truncate font-mono text-[13px] text-ink no-underline hover:text-accent-ink"
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
        </Card>

        <Card
          title={t("latestClicks")}
          description={t("latestClicksDesc")}
          actions={
            recent.length > 0 ? (
              <Badge tone="success" dot>
                {t("live")}
              </Badge>
            ) : null
          }
        >
          {recent.length === 0 ? (
            <EmptyState
              bare
              size="sm"
              icon="arrow-pointer"
              title={t("nothingYet")}
              description={t("nothingYetBody")}
            />
          ) : (
            <ol className="m-0 flex list-none flex-col divide-y divide-border-subtle p-0">
              {recent.map((event, index) => (
                <li
                  key={`${event.ts}-${event.destination}-${index}`}
                  className="flex min-w-0 items-start gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <span
                    className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-default bg-surface text-fg-subtle"
                    aria-hidden="true"
                  >
                    <Icon name="arrow-pointer" className="text-[11px]" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm text-ink">
                      {countryName(event.country, locale, unknown)}
                      {event.city ? ` · ${event.city}` : ""} · {titleCase(event.device, unknown)} ·{" "}
                      {titleCase(event.browser, unknown)}
                    </span>
                    <span className="truncate text-xs text-fg-subtle">
                      {formatDateTime(parseClickhouseDate(event.ts))} ·{" "}
                      <span className="font-mono">{truncateMiddle(event.destination, 40)}</span>
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </Grid>
    </PanelShell>
  );
}

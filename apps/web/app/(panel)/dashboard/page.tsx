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
  BreakdownList,
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
import { loadBreakdown, loadRecentEvents, loadSummary, loadTimeseries, loadTopLinks } from "@/lib/analytics";
import { formatNumber, parseClickhouseDate, truncateMiddle } from "@/lib/format";
import { getWorkspaceUsage } from "@/lib/quota";
import { requireWorkspace } from "@/lib/session";
import { readDraftDestination } from "@/lib/draft-link";
import { countryFlag, deviceIcon } from "@/lib/stats-icons";
import { GettingStartedCard } from "./getting-started-card";
import { loadGettingStarted } from "./getting-started";
import { loadAttention, type AttentionLink } from "./attention";
import {
  clampRangeToRetention,
  countryName,
  deltaPercent,
  formatRelativeTime,
  formatShare,
  localizedRangeLabel,
  previousTotalEvents,
  resolveRange,
  titleCase,
  totalEvents,
  trendOf,
} from "@/lib/stats";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("panel");
  return { title: t("dashboard") };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const EVENT_ICONS = {
  click: "arrow-pointer",
  qr_scan: "qrcode",
  bio_view: "address-card",
  bio_click: "arrow-pointer",
} as const;

function eventIcon(type: string) {
  return type in EVENT_ICONS ? EVENT_ICONS[type as keyof typeof EVENT_ICONS] : "arrow-pointer";
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

  const [
    summary,
    series,
    topLinks,
    recent,
    countries,
    devices,
    referrers,
    usage,
    draft,
    gettingStarted,
    attention,
    t,
    tc,
    ts,
  ] = await Promise.all([
    loadSummary(scope),
    loadTimeseries(scope, range.granularity),
    loadTopLinks(scope, 6),
    loadRecentEvents(scope, 6),
    loadBreakdown(scope, "country", 5),
    loadBreakdown(scope, "device", 5),
    loadBreakdown(scope, "referrer", 5),
    getWorkspaceUsage(context.workspace.id),
    readDraftDestination(),
    loadGettingStarted(context),
    loadAttention(context.workspace.id),
    getTranslations("panel"),
    getTranslations("common"),
    getTranslations("stats"),
  ]);
  const rangeLabel = localizedRangeLabel(range, ts);
  const unknown = ts("unknown");
  const noneDelta = ts("deltaNone");

  const linkLimit = context.plan.limits.links;
  const overQuota = !isWithinLimit(linkLimit, usage.links);
  const nearQuota = !overQuota && linkLimit !== -1 && usage.links / Math.max(linkLimit, 1) >= 0.85;
  const hasLinks = usage.links > 0;
  if (!hasLinks && draft) {
    redirect("/links/new");
  }

  // The chart plots every event in scope, so the headline figure is the same sum.
  const total = totalEvents(summary);
  const previousTotal = previousTotalEvents(summary);
  // WITH FILL returns zero buckets for an empty range, so "no data" is a zero total,
  // not an empty series.
  const hasTraffic = total > 0;
  const peakClicks = series.reduce((acc, point) => Math.max(acc, point.clicks), 0);

  /** Headline delta as a plain percentage; the StatCard draws the arrow. */
  const deltaText = (current: number, previous: number): string => {
    const delta = deltaPercent(current, previous);
    return delta === 0 ? noneDelta : `${Math.abs(delta)}%`;
  };
  const comparison = range.comparePrevious ? t("vsPrevious", { range: rangeLabel }) : rangeLabel;
  const trendDescription = range.granularity === "hour" ? t("clickTrendDescHour") : t("clickTrendDescDay");

  const topCountry = countries.find((row) => row.key !== "unknown") ?? null;
  const attentionTotal = attention.broken.total + attention.limitReached.total;
  const now = new Date();

  const attentionRow = (item: AttentionLink, kind: "broken" | "limit") => (
    <li key={`${kind}-${item.id}`} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
      <Badge tone={kind === "broken" ? "danger" : "warn"} size="sm" dot>
        {kind === "broken" ? t("attentionBrokenBadge") : t("attentionLimitBadge")}
      </Badge>
      <Link
        href={`/links/${item.id}`}
        className="min-w-0 truncate font-mono text-[13px] font-medium text-ink hover:text-accent-ink"
      >
        {item.label}
      </Link>
      <span className="min-w-0 text-[13px] text-fg-muted">
        {kind === "broken"
          ? item.statusCode
            ? t("attentionBrokenStatus", { status: item.statusCode })
            : t("attentionBrokenNoAnswer")
          : t("attentionLimitReached", { limit: formatNumber(item.maxClicks ?? 0) })}
        {item.since ? ` · ${formatRelativeTime(new Date(item.since), locale, now)}` : ""}
      </span>
    </li>
  );

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

      {/*
        Links that are live but failing their visitors: the destination is down, or the
        click limit is used up and people land on the "expired" page. Each row links
        straight to the editor, where both are fixed.
      */}
      {attentionTotal > 0 ? (
        <Callout
          tone="warn"
          title={t("attentionTitle", { count: attentionTotal })}
          actions={
            <>
              {attention.broken.total > 0 ? (
                <Button size="sm" href="/links?health=broken" leadingIcon="warning">
                  {t("attentionReviewBroken", { count: attention.broken.total })}
                </Button>
              ) : null}
              {attention.limitReached.total > 0 ? (
                <Button size="sm" href="/links?clickLimit=reached" leadingIcon="ban">
                  {t("attentionReviewLimits", { count: attention.limitReached.total })}
                </Button>
              ) : null}
            </>
          }
        >
          <p className="m-0">{t("attentionBody")}</p>
          <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
            {attention.broken.items.map((item) => attentionRow(item, "broken"))}
            {attention.limitReached.items.map((item) => attentionRow(item, "limit"))}
          </ul>
        </Callout>
      ) : null}

      {gettingStarted ? <GettingStartedCard steps={gettingStarted} /> : null}

      <Grid columns={4}>
        <StatCard
          icon="arrow-pointer"
          label={ts("clicks")}
          info={t("clicksInfo")}
          value={formatNumber(total)}
          delta={range.comparePrevious ? deltaText(total, previousTotal) : undefined}
          trend={range.comparePrevious ? trendOf(total, previousTotal) : "neutral"}
          deltaLabel={comparison}
          href="/analytics"
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
          value={formatNumber(summary.visitors)}
          delta={range.comparePrevious ? deltaText(summary.visitors, summary.previousVisitors) : undefined}
          trend={range.comparePrevious ? trendOf(summary.visitors, summary.previousVisitors) : "neutral"}
          deltaLabel={comparison}
          href="/analytics"
          sparkline={
            series.length > 1 && hasTraffic ? (
              <Sparkline data={series.map((point) => point.visitors)} tone="chart-2" />
            ) : null
          }
        />
        <StatCard
          icon="earth"
          label={t("topCountry")}
          info={t("topCountryInfo")}
          value={
            topCountry ? (
              <span className="text-[22px]">
                <span aria-hidden="true">{countryFlag(topCountry.key)} </span>
                {countryName(topCountry.key, locale, unknown)}
              </span>
            ) : (
              <span className="text-fg-subtle">—</span>
            )
          }
          deltaLabel={
            topCountry
              ? t("topCountryShare", {
                  share: formatShare(topCountry.clicks, total),
                  count: summary.countries,
                })
              : t("topCountryNone")
          }
          href="/analytics"
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
          deltaLabel={linkLimit === -1 ? t("linksUsedUnlimited") : undefined}
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
          hasTraffic
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
        {!hasTraffic ? (
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
            <Button size="sm" variant="ghost" trailingIcon="arrow-right" href="/analytics#top-links">
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
                        <span className="text-fg-subtle">{row.hostname}/</span>
                        {row.slug}
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
          title={t("recentActivity")}
          description={t("latestClicksDesc")}
          actions={
            recent.length > 0 ? (
              <Button size="sm" variant="ghost" trailingIcon="arrow-right" href="/analytics#recent">
                {tc("viewAll")}
              </Button>
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
              {recent.map((event, index) => {
                const flag = countryFlag(event.country);
                const target = event.slug
                  ? `${event.hostname}/${event.slug}`
                  : truncateMiddle(event.destination, 40);
                return (
                  <li
                    key={`${event.ts}-${event.destination}-${index}`}
                    className="flex min-w-0 items-start gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <span
                      className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-default bg-surface text-fg-subtle"
                      aria-hidden="true"
                    >
                      <Icon name={eventIcon(event.type)} className="text-[11px]" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex min-w-0 items-center gap-1.5 text-sm text-ink">
                        {flag ? <span aria-hidden="true">{flag}</span> : null}
                        <span className="truncate">
                          {countryName(event.country, locale, unknown)}
                          {event.city ? `, ${event.city}` : ""}
                        </span>
                        <span className="shrink-0 text-fg-subtle">·</span>
                        <span className="flex shrink-0 items-center gap-1 text-[13px] text-fg-muted">
                          {deviceIcon(event.device)}
                          {titleCase(event.device, unknown)}
                        </span>
                      </span>
                      <span className="truncate text-xs text-fg-subtle">
                        {ts(`eventKind.${eventKind(event.type)}`)} ·{" "}
                        <span className="font-mono">{target}</span>
                      </span>
                    </span>
                    <time
                      dateTime={parseClickhouseDate(event.ts).toISOString()}
                      className="numeric shrink-0 text-xs text-fg-subtle"
                    >
                      {formatRelativeTime(parseClickhouseDate(event.ts), locale, now)}
                    </time>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </Grid>

      {hasTraffic ? (
        <Grid columns={3}>
          <BreakdownList
            title={t("topCountries")}
            rows={countries.map((row) => ({
              key: row.key,
              label: countryName(row.key, locale, unknown),
              value: row.clicks,
              badge: countryFlag(row.key) || <Icon name="earth" className="text-xs text-fg-subtle" />,
            }))}
            total={total}
            meta={
              <Link href="/analytics" className="text-xs text-fg-subtle hover:text-accent-ink">
                {t("seeMore")}
              </Link>
            }
          />
          <BreakdownList
            title={t("topDevices")}
            rows={devices.map((row) => ({
              key: row.key,
              label: titleCase(row.key, unknown),
              value: row.clicks,
              badge: deviceIcon(row.key) ?? <Icon name="laptop" className="text-xs text-fg-subtle" />,
            }))}
            total={total}
          />
          <BreakdownList
            title={t("topReferrers")}
            rows={referrers.map((row) => ({
              key: row.key,
              label: row.key === "unknown" ? ts("direct") : row.key,
              value: row.clicks,
              badge: (
                <Icon
                  name={row.key === "unknown" ? "arrow-pointer" : "share-nodes"}
                  className="text-xs text-fg-subtle"
                />
              ),
            }))}
            total={total}
            footer={
              <>
                <Icon name="circle-info" className="text-sm text-fg-subtle" />
                {ts("referrerDirectHint")}
              </>
            }
          />
        </Grid>
      ) : null}
    </PanelShell>
  );
}

function eventKind(type: string): "click" | "qr_scan" | "bio_view" | "bio_click" {
  return type === "qr_scan" || type === "bio_view" || type === "bio_click" ? type : "click";
}

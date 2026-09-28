import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { TimeseriesChart } from "@/components/charts/timeseries-chart";
import { Icon } from "@/components/kit/icon";
import {
  BreakdownList,
  Card,
  EmptyState,
  Grid,
  InfoTip,
  PageHeader,
  StatCard,
  TabLinks,
  type BreakdownListRow,
} from "@/components/ui";
import { clientIp } from "@/lib/abuse";
import { formatNumber } from "@/lib/format";
import { browserIcon, countryFlag, deviceIcon } from "@/lib/stats-icons";
import {
  countryName,
  deltaPercent,
  firstParam,
  formatRelativeTime,
  formatShare,
  titleCase,
  trendOf,
} from "@/lib/stats";
import { getSharedStats, SHARE_RANGE_KEYS, type SharedStats } from "@/lib/stats-shares";
import { ShareChrome } from "./share-chrome";

/** Public, read-only link statistics. Rendered per request: revocation must be immediate. */
export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("share");
  return {
    title: t("metaTitle"),
    // The token is the only secret; keep it out of search engines and Referer headers.
    robots: { index: false, follow: false, nocache: true },
    referrer: "no-referrer",
  };
}

function toRows(
  rows: SharedStats["devices"],
  label: (key: string) => string,
  badge?: (key: string) => BreakdownListRow["badge"],
): BreakdownListRow[] {
  return rows.map((row) => ({
    key: row.key,
    label: label(row.key),
    value: row.clicks,
    badge: badge ? badge(row.key) : undefined,
  }));
}

export default async function SharedStatsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ token }, query, headerList, t, ts, locale] = await Promise.all([
    params,
    searchParams,
    headers(),
    getTranslations("share"),
    getTranslations("stats"),
    getLocale(),
  ]);

  const result = await getSharedStats(token, firstParam(query.range), { ip: clientIp(headerList) });
  if (result.status === "not_found") {
    notFound();
  }
  if (result.status === "rate_limited") {
    return (
      <ShareChrome>
        <EmptyState
          className="mx-auto w-full max-w-lg"
          icon="clock"
          title={t("rateLimitedTitle")}
          description={t("rateLimitedBody")}
        />
      </ShareChrome>
    );
  }

  const { stats } = result;
  const unknown = t("unknown");
  // The chart counts every visit to the link, QR scans included, so the headline does too.
  const clicks = stats.totals.clicks + stats.totals.qrScans;
  const previousClicks = stats.totals.previousClicks + (stats.totals.previousQrScans ?? 0);
  const compare = stats.range.key !== "all";
  const deltaText = (current: number, previous: number): string => {
    const delta = deltaPercent(current, previous);
    return delta === 0 ? ts("deltaNone") : `${Math.abs(delta)}%`;
  };
  const heading = stats.link.title ?? stats.link.shortUrl.replace(/^https:\/\//, "");
  const rangeName = t(`ranges.${stats.range.key}`);
  const hasTraffic = clicks > 0;
  const iconBadge = (node: BreakdownListRow["badge"], fallback: "laptop" | "compass") =>
    node ?? <Icon name={fallback} className="text-xs text-fg-subtle" />;

  return (
    <ShareChrome>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={heading}
        description={
          <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 break-all">
            <span className="font-mono text-[13px] text-ink">
              {stats.link.shortUrl.replace(/^https:\/\//, "")}
            </span>
            {stats.link.destinationHost ? (
              <>
                <Icon name="arrow-right" className="text-[10px] text-fg-subtle" />
                <span className="font-mono text-[13px]">{stats.link.destinationHost}</span>
              </>
            ) : null}
          </span>
        }
        tabs={
          <TabLinks
            variant="segmented"
            label={t("rangeLabel")}
            value={stats.range.key}
            items={SHARE_RANGE_KEYS.map((key) => ({
              id: key,
              label: t(`ranges.${key}`),
              href: `?range=${key}`,
            }))}
          />
        }
      />

      <Grid columns={3}>
        <StatCard
          icon="arrow-pointer"
          label={t("clicks")}
          info={t("clicksInfo")}
          value={formatNumber(clicks)}
          delta={compare ? deltaText(clicks, previousClicks) : undefined}
          trend={compare ? trendOf(clicks, previousClicks) : "neutral"}
          deltaLabel={compare ? t("vsPrevious") : rangeName}
        />
        <StatCard
          icon="users"
          label={t("visitors")}
          info={t("visitorsInfo")}
          value={formatNumber(stats.totals.visitors)}
          delta={compare ? deltaText(stats.totals.visitors, stats.totals.previousVisitors) : undefined}
          trend={compare ? trendOf(stats.totals.visitors, stats.totals.previousVisitors) : "neutral"}
          deltaLabel={compare ? t("vsPrevious") : rangeName}
        />
        <StatCard
          icon="qrcode"
          label={t("qrScans")}
          info={t("qrScansInfo")}
          value={formatNumber(stats.totals.qrScans)}
          deltaLabel={t("qrShare", { share: formatShare(stats.totals.qrScans, clicks) })}
        />
      </Grid>

      <Card
        title={
          <span className="inline-flex items-center gap-1.5">
            {t("overTime")}
            <InfoTip label={t("overTime")}>{t("overTimeInfo")}</InfoTip>
          </span>
        }
        description={stats.range.granularity === "hour" ? t("overTimeHour") : t("overTimeDay")}
      >
        {hasTraffic ? (
          <>
            <div className="flex flex-wrap items-center gap-4 text-xs text-fg-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-pill bg-chart-1" aria-hidden="true" />
                {t("clicks")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-pill bg-chart-2" aria-hidden="true" />
                {t("visitors")}
              </span>
            </div>
            <TimeseriesChart
              data={stats.timeseries}
              granularity={stats.range.granularity}
              clicksLabel={t("clicks")}
              visitorsLabel={t("visitors")}
            />
          </>
        ) : (
          <EmptyState bare size="sm" icon="chart-line" title={t("emptyTitle")} description={t("emptyBody")} />
        )}
      </Card>

      {hasTraffic ? (
        <Grid columns={2}>
          {stats.countries ? (
            <BreakdownList
              title={t("countries")}
              rows={toRows(
                stats.countries,
                (key) => countryName(key, locale, unknown),
                (key) => countryFlag(key) || <Icon name="earth" className="text-xs text-fg-subtle" />,
              )}
              total={clicks}
              limit={10}
            />
          ) : null}
          {stats.referrers ? (
            <BreakdownList
              title={t("referrers")}
              rows={toRows(
                stats.referrers,
                (key) => (key === "unknown" ? t("direct") : key),
                (key) => (
                  <Icon
                    name={key === "unknown" ? "arrow-pointer" : "share-nodes"}
                    className="text-xs text-fg-subtle"
                  />
                ),
              )}
              total={clicks}
              limit={10}
            />
          ) : null}
          <BreakdownList
            title={t("devices")}
            rows={toRows(
              stats.devices,
              (key) => titleCase(key, unknown),
              (key) => iconBadge(deviceIcon(key), "laptop"),
            )}
            total={clicks}
            limit={8}
          />
          <BreakdownList
            title={t("browsers")}
            rows={toRows(
              stats.browsers,
              (key) => titleCase(key, unknown),
              (key) => iconBadge(browserIcon(key), "compass"),
            )}
            total={clicks}
            limit={8}
          />
        </Grid>
      ) : null}

      <div className="flex min-w-0 flex-col gap-1 text-[13px] text-fg-subtle">
        <p className="m-0 flex items-center gap-1.5">
          <Icon name="shield" className="text-xs" />
          {t("footnote")}
        </p>
        {stats.range.clamped && stats.range.key !== "all" ? <p className="m-0">{t("clampedNote")}</p> : null}
        {stats.share.expiresAt ? (
          <p className="m-0">
            {t("expiresNote", {
              date: new Date(stats.share.expiresAt).toLocaleDateString(locale, { dateStyle: "medium" }),
            })}
          </p>
        ) : null}
        <p className="m-0">
          {t("updatedNote", { time: formatRelativeTime(new Date(stats.generatedAt), locale) })}
        </p>
      </div>
    </ShareChrome>
  );
}

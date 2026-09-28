import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { TimeseriesChart } from "@/components/charts/timeseries-chart";
import { BreakdownList, EmptyState, type BreakdownListRow } from "@/components/ui";
import { clientIp } from "@/lib/abuse";
import { cn } from "@/lib/cx";
import { formatNumber } from "@/lib/format";
import { countryName, deltaPercent, firstParam, titleCase } from "@/lib/stats";
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
): BreakdownListRow[] {
  return rows.map((row) => ({ key: row.key, label: label(row.key), value: row.clicks }));
}

export default async function SharedStatsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ token }, query, headerList, t, locale] = await Promise.all([
    params,
    searchParams,
    headers(),
    getTranslations("share"),
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
          title={t("rateLimitedTitle")}
          description={t("rateLimitedBody")}
        />
      </ShareChrome>
    );
  }

  const { stats } = result;
  const unknown = t("unknown");
  const delta = deltaPercent(stats.totals.clicks, stats.totals.previousClicks);
  const heading = stats.link.title ?? stats.link.shortUrl.replace(/^https:\/\//, "");

  return (
    <ShareChrome>
      <section className="flex min-w-0 flex-col gap-2">
        <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">{t("eyebrow")}</span>
        <h1 className="text-2xl font-semibold tracking-tight break-words text-fg">{heading}</h1>
        <p className="text-sm break-all text-fg-muted">
          {stats.link.shortUrl}
          {stats.link.destinationHost ? ` → ${stats.link.destinationHost}` : ""}
        </p>
      </section>

      <nav aria-label={t("rangeLabel")} className="flex min-w-0 flex-wrap gap-2">
        {SHARE_RANGE_KEYS.map((key) => (
          <Link
            key={key}
            href={`?range=${key}`}
            prefetch={false}
            aria-current={stats.range.key === key ? "page" : undefined}
            className={cn(
              "rounded-default border px-3 py-1.5 text-sm",
              stats.range.key === key
                ? "border-accent bg-accent text-on-accent"
                : "border-border text-fg-muted hover:text-fg",
            )}
          >
            {t(`ranges.${key}`)}
          </Link>
        ))}
      </nav>

      <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-1 rounded-default border border-border bg-surface p-5">
          <span className="text-sm text-fg-muted">{t("clicks")}</span>
          <span className="text-3xl font-semibold tabular-nums text-fg">{formatNumber(stats.totals.clicks)}</span>
          {stats.range.key !== "all" ? (
            <span className="text-xs text-fg-subtle">
              {delta === 0 ? t("noChange") : t("change", { delta: `${delta > 0 ? "+" : ""}${delta}` })}
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-1 rounded-default border border-border bg-surface p-5">
          <span className="text-sm text-fg-muted">{t("visitors")}</span>
          <span className="text-3xl font-semibold tabular-nums text-fg">{formatNumber(stats.totals.visitors)}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-1 rounded-default border border-border bg-surface p-5">
          <span className="text-sm text-fg-muted">{t("qrScans")}</span>
          <span className="text-3xl font-semibold tabular-nums text-fg">{formatNumber(stats.totals.qrScans)}</span>
        </div>
      </section>

      <section className="flex min-w-0 flex-col gap-3 rounded-default border border-border bg-surface p-5">
        <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">{t("overTime")}</span>
        <TimeseriesChart data={stats.timeseries} granularity={stats.range.granularity} />
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
        {stats.countries ? (
          <BreakdownList
            title={t("countries")}
            rows={toRows(stats.countries, (key) => countryName(key, locale, unknown))}
            limit={10}
          />
        ) : null}
        {stats.referrers ? (
          <BreakdownList
            title={t("referrers")}
            rows={toRows(stats.referrers, (key) => (key === "unknown" ? t("direct") : key))}
            limit={10}
          />
        ) : null}
        <BreakdownList title={t("devices")} rows={toRows(stats.devices, (key) => titleCase(key, unknown))} limit={8} />
        <BreakdownList title={t("browsers")} rows={toRows(stats.browsers, (key) => titleCase(key, unknown))} limit={8} />
      </section>

      <footer className="flex min-w-0 flex-col gap-1 text-xs text-fg-subtle">
        <p>{t("footnote")}</p>
        {stats.range.clamped ? <p>{t("clampedNote")}</p> : null}
        {stats.share.expiresAt ? (
          <p>
            {t("expiresNote", {
              date: new Date(stats.share.expiresAt).toLocaleDateString(locale, { dateStyle: "medium" }),
            })}
          </p>
        ) : null}
      </footer>
    </ShareChrome>
  );
}

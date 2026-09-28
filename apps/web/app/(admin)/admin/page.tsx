import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { isPaidPublicPlan } from "@short/core";
import { TimeseriesChart } from "@/components/charts/timeseries-chart";
import { Icon, type IconName } from "@/components/kit/icon";
import { PanelShell } from "@/components/shell/panel-shell";
import {
  Badge,
  Card,
  EmptyState,
  Grid,
  PageHeader,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { getPlanDistribution, getPlatformCounts } from "@/lib/admin";
import { loadPlatformSeries, loadPlatformTotals } from "@/lib/analytics";
import { formatCurrency, formatNumber } from "@/lib/format";
import { requireSuperadmin } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.overview");
  return { title: t("metaTitle") };
}

export default async function AdminOverviewPage() {
  // The layout gates too, but pages and layouts render independently — never rely on it alone.
  await requireSuperadmin();
  const to = new Date();
  const from = new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
  const [t, tNav, tn] = await Promise.all([
    getTranslations("admin.overview"),
    getTranslations("admin.nav"),
    getTranslations("nav"),
  ]);

  const [counts, distribution, totals, series] = await Promise.all([
    getPlatformCounts(),
    getPlanDistribution(),
    loadPlatformTotals(from, to),
    loadPlatformSeries(from, to),
  ]);

  const mrr = distribution.reduce((sum, row) => sum + row.mrr, 0);
  const paidWorkspaces = distribution
    .filter((row) => isPaidPublicPlan(row.planKey))
    .reduce((sum, row) => sum + row.workspaces, 0);

  const attention: Array<{ icon: IconName; label: string; value: number; href: string; alert: boolean }> = [
    {
      icon: "flag",
      label: t("flaggedLinks"),
      value: counts.flaggedLinks,
      href: "/admin/links?status=flagged",
      alert: true,
    },
    {
      icon: "ban",
      label: t("bannedUsers"),
      value: counts.bannedUsers,
      href: "/admin/users?status=banned",
      alert: false,
    },
    {
      icon: "globe",
      label: t("pendingDomains"),
      value: counts.pendingDomains,
      href: "/admin/domains?status=pending",
      alert: true,
    },
    {
      icon: "building",
      label: tn("admin-workspaces"),
      value: counts.workspaces,
      href: "/admin/workspaces",
      alert: false,
    },
    {
      icon: "qrcode",
      label: t("bioAndQr"),
      value: counts.biopages + counts.qrCodes,
      href: "/admin/workspaces",
      alert: false,
    },
  ];

  return (
    <PanelShell title={t("title")} crumbs={[{ label: tNav("admin"), href: "/admin" }]}>
      <PageHeader
        title={t("title")}
        meta={<Badge tone="neutral">{t("eyebrow")}</Badge>}
        description={t("description")}
      />

      <Grid columns={4}>
        <StatCard
          icon="credit-card"
          label={t("mrr")}
          info={t("mrrInfo")}
          value={formatCurrency(mrr)}
          deltaLabel={t("paid", { count: formatNumber(paidWorkspaces) })}
          href="/admin/workspaces"
        />
        <StatCard
          icon="arrow-pointer"
          label={t("clicks30d")}
          info={t("clicksInfo")}
          value={formatNumber(totals.clicks)}
          deltaLabel={t("visitors", { count: formatNumber(totals.visitors) })}
        />
        <StatCard
          icon="users"
          label={tn("admin-users")}
          info={t("usersInfo")}
          value={formatNumber(counts.users)}
          delta={counts.newUsers7d > 0 ? `+${formatNumber(counts.newUsers7d)}` : undefined}
          trend={counts.newUsers7d > 0 ? "up" : "neutral"}
          deltaLabel={t("lastWeek")}
          href="/admin/users"
        />
        <StatCard
          icon="link"
          label={tn("links")}
          info={t("linksInfo")}
          value={formatNumber(counts.links)}
          delta={counts.newLinks7d > 0 ? `+${formatNumber(counts.newLinks7d)}` : undefined}
          trend={counts.newLinks7d > 0 ? "up" : "neutral"}
          deltaLabel={t("lastWeek")}
          href="/admin/links"
        />
      </Grid>

      <Card title={t("traffic")} description={t("trafficDesc")}>
        {series.length === 0 ? (
          <EmptyState bare size="sm" icon="chart-line" title={t("noTraffic")} description={t("noTrafficDesc")} />
        ) : (
          <TimeseriesChart data={series} granularity="day" height={280} />
        )}
      </Card>

      <Grid columns={2}>
        <Card padding="none" title={t("planMix")} description={t("planMixDesc")}>
          <Table bare density="compact" label={t("planMix")}>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{tNav("plan")}</TableHeaderCell>
                <TableHeaderCell numeric>{t("accounts")}</TableHeaderCell>
                <TableHeaderCell numeric>{t("mrr")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {distribution.map((row) => (
                <TableRow key={row.planKey}>
                  <TableCell>
                    <Link
                      href={`/admin/workspaces?plan=${row.planKey}`}
                      className="font-medium text-ink no-underline hover:text-accent-ink hover:no-underline"
                    >
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell numeric>{formatNumber(row.workspaces)}</TableCell>
                  <TableCell numeric className="text-fg-muted">
                    {formatCurrency(row.mrr)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card title={t("needsAttention")} description={t("attentionDesc")}>
          <ul className="m-0 flex list-none flex-col divide-y divide-border-subtle p-0">
            {attention.map((item) => (
              <li key={item.label} className="py-1 first:pt-0 last:pb-0">
                <Link
                  href={item.href}
                  className="group flex min-w-0 items-center gap-3 rounded-default px-2 py-2 text-ink no-underline -mx-2 hover:bg-surface hover:no-underline"
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-default bg-surface text-fg-muted group-hover:bg-bg"
                    aria-hidden="true"
                  >
                    <Icon name={item.icon} className="text-xs" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
                  <Badge tone={item.alert && item.value > 0 ? "warn" : "neutral"}>{formatNumber(item.value)}</Badge>
                  <Icon name="chevron-right" className="shrink-0 text-[10px] text-fg-subtle" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </Grid>
    </PanelShell>
  );
}

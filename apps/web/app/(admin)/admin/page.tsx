import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { TimeseriesChart } from "@/components/charts/timeseries-chart";
import { PanelShell } from "@/components/shell/panel-shell";
import {
  Badge,
  Button,
  Card,
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
import { isPaidPublicPlan } from "@short/core";
import { getPlanDistribution, getPlatformCounts } from "@/lib/admin";
import { loadPlatformSeries, loadPlatformTotals } from "@/lib/analytics";
import { formatCurrency, formatNumber } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.overview");
  return { title: t("metaTitle") };
}

export default async function AdminOverviewPage() {
  const to = new Date();
  const from = new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
  const t = await getTranslations("admin.overview");
  const tNav = await getTranslations("admin.nav");
  const tn = await getTranslations("nav");

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

  return (
    <PanelShell title={t("shellTitle")} crumbs={[{ label: tNav("admin") }]}>
      <Hero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <Grid columns={4}>
        <Card
          label={t("mrr")}
          value={formatCurrency(mrr)}
          delta={t("paid", { count: formatNumber(paidWorkspaces) })}
          staticHover
        />
        <Card
          label={t("clicks30d")}
          value={formatNumber(totals.clicks)}
          delta={t("visitors", { count: formatNumber(totals.visitors) })}
          staticHover
        />
        <Card
          label={tn("admin-users")}
          value={formatNumber(counts.users)}
          delta={t("thisWeek", { count: formatNumber(counts.newUsers7d) })}
          staticHover
        />
        <Card
          label={tn("links")}
          value={formatNumber(counts.links)}
          delta={t("thisWeek", { count: formatNumber(counts.newLinks7d) })}
          staticHover
        />
      </Grid>

      <Section title={t("traffic")} description={t("trafficDesc")}>
        <Card staticHover>
          <TimeseriesChart data={series} granularity="day" height={280} />
        </Card>
      </Section>

      <Grid columns={2}>
        <Section title={t("planMix")}>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{tNav("plan")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{tn("admin-workspaces")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t("mrr")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {distribution.map((row) => (
                <TableRow key={row.planKey}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(row.workspaces)}
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(row.mrr)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section title={t("needsAttention")}>
          <div className="flex min-w-0 flex-col gap-3">
            <AttentionRow
              icon={<Icon name="flag" className="text-sm" />}
              label={t("flaggedLinks")}
              value={counts.flaggedLinks}
              href="/admin/links?status=flagged"
              actionLabel={tNav("view")}
            />
            <AttentionRow
              icon={<Icon name="users" className="text-sm" />}
              label={t("bannedUsers")}
              value={counts.bannedUsers}
              href="/admin/users?status=banned"
              actionLabel={tNav("view")}
            />
            <AttentionRow
              icon={<Icon name="globe" className="text-sm" />}
              label={t("pendingDomains")}
              value={counts.pendingDomains}
              href="/admin/domains?status=pending"
              actionLabel={tNav("view")}
            />
            <AttentionRow
              icon={<Icon name="building" className="text-sm" />}
              label={tn("admin-workspaces")}
              value={counts.workspaces}
              href="/admin/workspaces"
              actionLabel={tNav("view")}
            />
            <AttentionRow
              icon={<Icon name="link" className="text-sm" />}
              label={t("bioAndQr")}
              value={counts.biopages + counts.qrCodes}
              href="/admin/workspaces"
              actionLabel={tNav("view")}
            />
          </div>
        </Section>
      </Grid>
    </PanelShell>
  );
}

function AttentionRow({
  icon,
  label,
  value,
  href,
  actionLabel,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  href: string;
  actionLabel: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-default border border-border px-4 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-default bg-surface text-fg-muted">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
      <Badge tone={value > 0 ? "warn" : "muted"}>{formatNumber(value)}</Badge>
      <Button size="sm" variant="ghost" href={href}>
        {actionLabel}
      </Button>
    </div>
  );
}

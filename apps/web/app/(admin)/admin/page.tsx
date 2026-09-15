import type { Metadata } from "next";
import { Building2, Flag, Globe, Link2, Users } from "lucide-react";
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
import { getPlanDistribution, getPlatformCounts } from "@/lib/admin";
import { loadPlatformSeries, loadPlatformTotals } from "@/lib/analytics";
import { formatCurrency, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Platform overview" };

export default async function AdminOverviewPage() {
  const to = new Date();
  const from = new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);

  const [counts, distribution, totals, series] = await Promise.all([
    getPlatformCounts(),
    getPlanDistribution(),
    loadPlatformTotals(from, to),
    loadPlatformSeries(from, to),
  ]);

  const mrr = distribution.reduce((sum, row) => sum + row.mrr, 0);
  const paidWorkspaces = distribution
    .filter((row) => row.planKey !== "free")
    .reduce((sum, row) => sum + row.workspaces, 0);

  return (
    <PanelShell title="Platform" crumbs={[{ label: "Admin" }]}>
      <Hero
        eyebrow="Last 30 days"
        title="Platform overview"
        description="Aggregate health across every workspace: growth, revenue, traffic and anything that needs moderation."
      />

      <Grid columns={4}>
        <Card label="MRR" value={formatCurrency(mrr)} delta={`${paidWorkspaces} paid`} staticHover />
        <Card
          label="Clicks (30d)"
          value={formatNumber(totals.clicks)}
          delta={`${formatNumber(totals.visitors)} visitors`}
          staticHover
        />
        <Card
          label="Users"
          value={formatNumber(counts.users)}
          delta={`+${formatNumber(counts.newUsers7d)} this week`}
          staticHover
        />
        <Card
          label="Links"
          value={formatNumber(counts.links)}
          delta={`+${formatNumber(counts.newLinks7d)} this week`}
          staticHover
        />
      </Grid>

      <Section title="Traffic" description="Daily clicks and unique visitors across all workspaces.">
        <Card staticHover>
          <TimeseriesChart data={series} granularity="day" height={280} />
        </Card>
      </Section>

      <Grid columns={2}>
        <Section title="Plan mix">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Plan</TableHeaderCell>
                <TableHeaderCell className="text-right">Workspaces</TableHeaderCell>
                <TableHeaderCell className="text-right">MRR</TableHeaderCell>
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

        <Section title="Needs attention">
          <div className="flex min-w-0 flex-col gap-3">
            <AttentionRow
              icon={<Flag className="size-4" />}
              label="Links flagged for abuse"
              value={counts.flaggedLinks}
              href="/admin/links?status=flagged"
            />
            <AttentionRow
              icon={<Users className="size-4" />}
              label="Banned users"
              value={counts.bannedUsers}
              href="/admin/users?status=banned"
            />
            <AttentionRow
              icon={<Globe className="size-4" />}
              label="Domains awaiting DNS"
              value={counts.pendingDomains}
              href="/admin/domains?status=pending"
            />
            <AttentionRow
              icon={<Building2 className="size-4" />}
              label="Workspaces"
              value={counts.workspaces}
              href="/admin/workspaces"
            />
            <AttentionRow
              icon={<Link2 className="size-4" />}
              label="Bio pages & QR codes"
              value={counts.biopages + counts.qrCodes}
              href="/admin/workspaces"
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
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-default border border-border px-4 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-default bg-surface text-fg-muted">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
      <Badge tone={value > 0 ? "warn" : "muted"}>{formatNumber(value)}</Badge>
      <Button size="sm" variant="ghost" href={href}>
        View
      </Button>
    </div>
  );
}

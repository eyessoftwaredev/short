import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  Gauge,
  Info,
  TrendingUp,
} from "lucide-react";
import { PanelShell } from "@/components/shell/panel-shell";
import { StatusBadge } from "@/components/shell/status-badge";
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
import { loadMonthlyClicks } from "@/lib/analytics";
import { getBillingAccount, getSubscription, listPlans } from "@/lib/billing";
import { cn } from "@/lib/cx";
import { formatCurrency, formatDate } from "@/lib/format";
import { currentPeriod, getWorkspaceUsage } from "@/lib/quota";
import { hasWorkspaceRole, requireWorkspace } from "@/lib/session";
import { stripeEnabled } from "@/lib/stripe";
import { ManageBillingButton } from "./manage-billing-button";
import { PlanPicker, type PlanCardView } from "./plan-picker";

export const metadata: Metadata = { title: "Billing" };

type NoticeTone = "danger" | "warn" | "accent" | "info";

const NOTICE_TONES: Record<NoticeTone, { box: string; icon: string }> = {
  danger: { box: "border-danger bg-danger-surface", icon: "text-danger" },
  warn: { box: "border-warn bg-warn-surface", icon: "text-warn-ink" },
  accent: { box: "border-accent bg-accent-tint", icon: "text-accent-ink" },
  info: { box: "border-border-strong bg-surface-subtle", icon: "text-fg-muted" },
};

function Notice({
  tone,
  icon,
  title,
  children,
  action,
}: {
  tone: NoticeTone;
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : undefined}
      className={cn(
        "flex min-w-0 flex-wrap items-start gap-x-3.5 gap-y-3 rounded-default border px-4 py-3.5",
        NOTICE_TONES[tone].box,
      )}
    >
      <span className={cn("mt-0.5 shrink-0", NOTICE_TONES[tone].icon)} aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-medium text-ink">{title}</p>
        <p className="m-0 mt-0.5 text-sm leading-relaxed text-fg-muted">{children}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function CardEyebrow({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return (
    <span
      className={cn(
        "font-mono text-xs tracking-widest uppercase",
        accent ? "text-accent-ink" : "text-fg-subtle",
      )}
    >
      {children}
    </span>
  );
}

type SearchParams = Promise<{ checkout?: string }>;

export default async function BillingPage({ searchParams }: { searchParams: SearchParams }) {
  const context = await requireWorkspace();
  const { checkout } = await searchParams;

  const [subscription, planRows, usage] = await Promise.all([
    getSubscription(context.workspace.id),
    listPlans(),
    getWorkspaceUsage(context.workspace.id),
  ]);

  // `usage_counters` is refreshed by the cron; reading ClickHouse directly here keeps the
  // number live for someone deciding whether to upgrade.
  const [clicks, account] = await Promise.all([
    loadMonthlyClicks(context.workspace.id, currentPeriod(), usage.clicksThisMonth),
    getBillingAccount(subscription?.stripeCustomerId ?? null),
  ]);

  const plan = context.plan;
  const cards: PlanCardView[] = planRows.map((row) => ({
    key: row.key,
    name: row.name,
    priceMonthly: row.priceMonthly,
    priceYearly: row.priceYearly,
    currency: row.currency,
    limits: {
      links: row.limits.links,
      clicksPerMonth: row.limits.clicksPerMonth,
      customDomains: row.limits.customDomains,
      biopages: row.limits.biopages,
      qrCodes: row.limits.qrCodes,
      members: row.limits.members,
      retentionDays: row.limits.retentionDays,
    },
    features: row.features,
    hasPrice: Boolean(row.stripePriceMonthlyId ?? row.stripePriceYearlyId),
  }));

  const activePlanKey = subscription?.planKey ?? "free";
  const activeRow = planRows.find((row) => row.key === activePlanKey);
  const yearly = subscription?.interval === "year";
  const priceNow = yearly ? activeRow?.priceYearly : activeRow?.priceMonthly;
  const pastDue = subscription?.status === "past_due";
  const canManage = hasWorkspaceRole(context.role, "owner") || context.isSuperadmin;
  const hasBillingAccount = Boolean(subscription?.stripeCustomerId);
  const cancelling = Boolean(subscription?.cancelAtPeriodEnd);
  const periodEnd = subscription?.currentPeriodEnd ?? null;

  const quotas = [
    { key: "links", label: "Links", used: usage.links, limit: plan.limits.links },
    {
      key: "clicks",
      label: "Clicks this month",
      used: clicks,
      limit: plan.limits.clicksPerMonth,
    },
    {
      key: "domains",
      label: "Custom domains",
      used: usage.customDomains,
      limit: plan.limits.customDomains,
    },
    { key: "bio", label: "Bio pages", used: usage.biopages, limit: plan.limits.biopages },
    { key: "qr", label: "QR codes", used: usage.qrCodes, limit: plan.limits.qrCodes },
    { key: "members", label: "Team members", used: usage.members, limit: plan.limits.members },
  ];

  const metered = quotas.filter((quota) => quota.limit !== -1 && quota.limit > 0);
  const reached = metered.filter((quota) => quota.used >= quota.limit);
  const nearing = metered.filter(
    (quota) => quota.used < quota.limit && quota.used / quota.limit >= 0.85,
  );

  // Only escalate when the numbers actually justify it — a permanent warning teaches
  // people to ignore the banner.
  const usageSummary =
    reached.length > 0
      ? `${reached.length} of ${metered.length} limits reached.`
      : nearing.length > 0
        ? `${nearing.length} of ${metered.length} limits above 85%.`
        : "Everything is comfortably inside your plan.";

  return (
    <PanelShell title="Billing" crumbs={[{ label: context.workspace.name }]}>
      <Hero
        eyebrow={`${plan.name} plan`}
        title="Plan and usage"
        description="Limits apply to the whole workspace. Upgrades take effect immediately; downgrades keep your existing data but block new items above the limit."
        actions={
          canManage && hasBillingAccount ? (
            <ManageBillingButton size="md" label="Manage billing" />
          ) : null
        }
      />

      {checkout === "success" ? (
        <Notice
          tone="accent"
          icon={<CheckCircle2 className="size-4" />}
          title="Payment received"
          action={
            <Button size="sm" href="/links">
              Back to links
            </Button>
          }
        >
          Your new plan is active and the higher limits apply right away.
        </Notice>
      ) : null}

      {checkout === "cancelled" ? (
        <Notice
          tone="info"
          icon={<Info className="size-4" />}
          title="Checkout cancelled"
          action={
            <Button size="sm" href="#plans">
              See plans again
            </Button>
          }
        >
          Nothing was charged and your plan is unchanged.
        </Notice>
      ) : null}

      {pastDue ? (
        <Notice
          tone="danger"
          icon={<AlertTriangle className="size-4" />}
          title="Payment failed"
          action={
            canManage ? (
              <ManageBillingButton variant="primary" label="Update card" />
            ) : (
              <Badge tone="danger">Owner action needed</Badge>
            )
          }
        >
          Paid features stay on for now and your links keep redirecting, but the card on file
          needs updating before the next retry.
        </Notice>
      ) : null}

      {cancelling && periodEnd ? (
        <Notice
          tone="warn"
          icon={<CalendarClock className="size-4" />}
          title={`${plan.name} ends on ${formatDate(periodEnd)}`}
          action={canManage ? <ManageBillingButton label="Resume plan" /> : null}
        >
          After that date the workspace drops to Free. Existing data is kept, but anything above
          the Free limits becomes read-only.
        </Notice>
      ) : null}

      {reached.length > 0 ? (
        <Notice
          tone="danger"
          icon={<Gauge className="size-4" />}
          title={reached.length === 1 ? "One limit reached" : `${reached.length} limits reached`}
          action={
            <Button size="sm" variant="primary" href="#plans">
              <TrendingUp className="size-4" aria-hidden="true" />
              Compare plans
            </Button>
          }
        >
          {reached.map((quota) => quota.label).join(", ")} — you cannot add more on the{" "}
          {plan.name} plan until you upgrade.
        </Notice>
      ) : null}

      <Grid columns={3}>
        <Card staticHover className="gap-3 border-accent bg-accent-tint">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <CardEyebrow accent>Current plan</CardEyebrow>
            <StatusBadge status={subscription?.status ?? "active"} />
          </div>
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-3xl leading-tight font-semibold tracking-tight">{plan.name}</span>
            <span className="text-sm text-fg-muted tabular-nums">
              {priceNow ? (
                <>
                  {formatCurrency(priceNow, plan.currency)} / {yearly ? "yr" : "mo"}
                </>
              ) : (
                "No charge"
              )}
            </span>
          </div>
          {cancelling ? <Badge tone="warn">Cancels at period end</Badge> : null}
          <p className="m-0 text-sm text-fg-muted">
            Analytics history on this plan: {plan.limits.retentionDays} days.
          </p>
        </Card>

        <Card staticHover className="gap-3">
          <CardEyebrow>Next invoice</CardEyebrow>
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-3xl leading-tight font-semibold tracking-tight tabular-nums">
              {cancelling || !priceNow ? "—" : formatCurrency(priceNow, plan.currency)}
            </span>
            {!cancelling && priceNow ? (
              <span className="text-sm text-fg-muted">{yearly ? "yearly" : "monthly"}</span>
            ) : null}
          </div>
          <p className="m-0 text-sm text-fg-muted">
            {cancelling && periodEnd
              ? `No further charges. Access ends ${formatDate(periodEnd)}.`
              : periodEnd
                ? `Charged on ${formatDate(periodEnd)}.`
                : priceNow
                  ? "No renewal date on file yet."
                  : "The Free plan never charges you."}
          </p>
          <p className="m-0 text-sm text-fg-muted">
            Billing period {currentPeriod()} · {yearly ? "annual" : "monthly"} cycle.
          </p>
        </Card>

        <Card staticHover className="gap-3">
          <CardEyebrow>Payment method</CardEyebrow>
          {account.paymentMethod ? (
            <>
              <div className="flex min-w-0 items-center gap-3 rounded-default border border-border bg-surface-subtle px-4 py-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-border bg-bg text-fg-muted"
                  aria-hidden="true"
                >
                  <CreditCard className="size-4" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium capitalize">
                    {account.paymentMethod.brand} ···· {account.paymentMethod.last4}
                  </span>
                  <span className="font-mono text-xs text-fg-subtle tabular-nums">
                    Expires {account.paymentMethod.expiry}
                  </span>
                </span>
              </div>
              {canManage ? (
                <ManageBillingButton label="Update card" withIcon={false} />
              ) : (
                <p className="m-0 text-sm text-fg-muted">
                  Only the workspace owner can change the card.
                </p>
              )}
            </>
          ) : (
            <>
              <div className="flex min-w-0 items-center gap-3 rounded-default border border-dashed border-border px-4 py-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-dashed border-border text-fg-disabled"
                  aria-hidden="true"
                >
                  <CreditCard className="size-4" />
                </span>
                <span className="min-w-0 text-sm text-fg-muted">No card on file</span>
              </div>
              <p className="m-0 text-sm text-fg-muted">
                {stripeEnabled()
                  ? "A card is collected during checkout — nothing is stored before that."
                  : "Billing is not configured on this deployment."}
              </p>
            </>
          )}
        </Card>
      </Grid>

      <Section
        title="Usage this period"
        description={usageSummary}
        actions={
          reached.length > 0 ? (
            <Badge tone="danger">{reached.length} at limit</Badge>
          ) : nearing.length > 0 ? (
            <Badge tone="warn">{nearing.length} near limit</Badge>
          ) : (
            <Badge tone="muted">Healthy</Badge>
          )
        }
      >
        <Card staticHover className="gap-6 p-6">
          <Grid columns={3} className="gap-x-8 gap-y-6">
            {quotas.map((quota) => (
              <QuotaMeter
                key={quota.key}
                label={quota.label}
                used={quota.used}
                limit={quota.limit}
              />
            ))}
          </Grid>
        </Card>
      </Section>

      <div id="plans" className="min-w-0 scroll-mt-6">
        <Section
          title="Plans"
          description="Switch at any time — Stripe prorates the difference on the next invoice."
        >
          <PlanPicker
            plans={cards}
            currentPlan={activePlanKey}
            currentInterval={yearly ? "year" : "month"}
            canManage={canManage}
            hasBillingAccount={hasBillingAccount}
            stripeConfigured={stripeEnabled()}
          />
        </Section>
      </div>

      <Section
        title="Invoices"
        description={
          account.invoices.length > 0
            ? `Last ${account.invoices.length} ${account.invoices.length === 1 ? "invoice" : "invoices"} from Stripe.`
            : undefined
        }
      >
        {account.invoices.length === 0 ? (
          <EmptyState
            icon={<Download className="size-5" />}
            eyebrow="Invoices"
            title="No invoices yet"
            description="Receipts appear here after your first paid period. Stripe stays the source of truth, so nothing is mirrored into this app."
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell scope="col">Invoice</TableHeaderCell>
                <TableHeaderCell scope="col">Date</TableHeaderCell>
                <TableHeaderCell scope="col" className="text-right">
                  Amount
                </TableHeaderCell>
                <TableHeaderCell scope="col">Status</TableHeaderCell>
                <TableHeaderCell scope="col" className="text-right">
                  Receipt
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {account.invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-xs">
                    <span className="block max-w-40 truncate">{invoice.number}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-fg-muted tabular-nums">
                    {formatDate(invoice.created)}
                  </TableCell>
                  <TableCell className="text-right font-mono whitespace-nowrap tabular-nums">
                    {formatCurrency(invoice.amountPaid, invoice.currency)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="flex justify-end gap-1">
                      {invoice.hostedUrl ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          href={invoice.hostedUrl}
                          aria-label={`View invoice ${invoice.number}`}
                        >
                          <ExternalLink className="size-4" aria-hidden="true" />
                          View
                        </Button>
                      ) : null}
                      {invoice.pdfUrl ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          href={invoice.pdfUrl}
                          aria-label={`Download invoice ${invoice.number} as PDF`}
                        >
                          <Download className="size-4" aria-hidden="true" />
                          PDF
                        </Button>
                      ) : null}
                      {!invoice.hostedUrl && !invoice.pdfUrl ? (
                        <span className="text-fg-subtle">—</span>
                      ) : null}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </PanelShell>
  );
}

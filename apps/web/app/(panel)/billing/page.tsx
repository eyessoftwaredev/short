import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
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
import { requireWorkspace } from "@/lib/session";
import { stripeEnabled } from "@/lib/stripe";
import { ManageBillingButton } from "./manage-billing-button";
import { PlanPicker, type PlanCardView } from "./plan-picker";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("billing");
  return { title: t("title") };
}

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
  const [t, tc, tp, te] = await Promise.all([
    getTranslations("billing"),
    getTranslations("common"),
    getTranslations("panel"),
    getTranslations("errors"),
  ]);

  const billedUserId = context.billingOwner?.id ?? context.user.id;
  const [subscription, planRows, usage] = await Promise.all([
    getSubscription(billedUserId),
    listPlans(),
    getWorkspaceUsage(context.workspace.id),
  ]);

  // `usage_counters` is refreshed by the cron; reading ClickHouse directly here keeps the
  // number live for someone deciding whether to upgrade.
  const [clicks, account, billingConfigured] = await Promise.all([
    loadMonthlyClicks(context.workspace.id, currentPeriod(), usage.clicksThisMonth),
    getBillingAccount(subscription?.stripeCustomerId ?? null),
    stripeEnabled(),
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
      teams: row.limits.teams,
      retentionDays: row.limits.retentionDays,
    },
    features: row.features,
    hasPrice: Boolean(row.stripePriceMonthlyId ?? row.stripePriceYearlyId),
  }));

  const activePlanKey = context.isSuperadmin ? "infinity" : (subscription?.planKey ?? "free");
  const activeRow = planRows.find((row) => row.key === activePlanKey);
  const yearly = subscription?.interval === "year";
  const priceNow = yearly ? activeRow?.priceYearly : activeRow?.priceMonthly;
  const pastDue = subscription?.status === "past_due";
  const canManage = context.isBillingOwner || context.isSuperadmin;
  const hasBillingAccount = Boolean(subscription?.stripeCustomerId);
  const cancelling = Boolean(subscription?.cancelAtPeriodEnd);
  const periodEnd = subscription?.currentPeriodEnd ?? null;

  const quotas = [
    { key: "links", label: t("limitLinks"), used: usage.links, limit: plan.limits.links },
    {
      key: "clicks",
      label: t("clicksThisMonth"),
      used: clicks,
      limit: plan.limits.clicksPerMonth,
    },
    {
      key: "domains",
      label: t("customDomains"),
      used: usage.customDomains,
      limit: plan.limits.customDomains,
    },
    { key: "bio", label: t("limitBio"), used: usage.biopages, limit: plan.limits.biopages },
    { key: "qr", label: t("limitQr"), used: usage.qrCodes, limit: plan.limits.qrCodes },
    { key: "members", label: t("teamMembers"), used: usage.members, limit: plan.limits.members },
    { key: "teams", label: t("limitTeams"), used: usage.teams, limit: plan.limits.teams },
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
      ? t("limitsReachedSummary", { reached: reached.length, total: metered.length })
      : nearing.length > 0
        ? t("limitsNearSummary", { nearing: nearing.length, total: metered.length })
        : t("usageHealthy");

  return (
    <PanelShell title={t("title")} crumbs={[{ label: context.workspace.name }]}>
      <Hero
        eyebrow={tp("planLabel", { name: plan.name })}
        title={t("heroTitle")}
        description={t("heroDescription")}
        actions={
          canManage && hasBillingAccount ? (
            <ManageBillingButton size="md" label={t("manageBilling")} />
          ) : null
        }
      />

      {!canManage && context.billingOwner ? (
        <Notice
          tone="info"
          icon={<Icon name="circle-info" className="text-sm" />}
          title={t("billedToTitle")}
        >
          {t("billedToBody", { name: context.billingOwner.name })}
        </Notice>
      ) : null}

      {checkout === "success" ? (
        <Notice
          tone="accent"
          icon={<Icon name="circle-check" className="text-sm" />}
          title={t("paymentReceived")}
          action={
            <Button size="sm" href="/links">
              {t("backToLinks")}
            </Button>
          }
        >
          {t("planActive")}
        </Notice>
      ) : null}

      {checkout === "cancelled" ? (
        <Notice
          tone="info"
          icon={<Icon name="circle-info" className="text-sm" />}
          title={t("checkoutCancelled")}
          action={
            <Button size="sm" href="#plans">
              {t("seePlansAgain")}
            </Button>
          }
        >
          {t("nothingCharged")}
        </Notice>
      ) : null}

      {pastDue ? (
        <Notice
          tone="danger"
          icon={<Icon name="warning" className="text-sm" />}
          title={t("paymentFailed")}
          action={
            canManage ? (
              <ManageBillingButton variant="primary" label={t("updateCard")} />
            ) : (
              <Badge tone="danger">{t("ownerAction")}</Badge>
            )
          }
        >
          {t("paymentFailedBody")}
        </Notice>
      ) : null}

      {cancelling && periodEnd ? (
        <Notice
          tone="warn"
          icon={<Icon name="calendar" className="text-sm" />}
          title={t("planEnds", { name: plan.name, date: formatDate(periodEnd) })}
          action={canManage ? <ManageBillingButton label={t("resumePlan")} /> : null}
        >
          {t("planEndsBody")}
        </Notice>
      ) : null}

      {reached.length > 0 ? (
        <Notice
          tone="danger"
          icon={<Icon name="gauge-high" className="text-sm" />}
          title={reached.length === 1 ? t("oneLimitReached") : t("limitsReached", { count: reached.length })}
          action={
            <Button size="sm" variant="primary" href="#plans">
              <Icon name="arrow-trend-up" className="text-sm" />
              {t("comparePlans")}
            </Button>
          }
        >
          {t("cannotAddMore", {
            labels: reached.map((quota) => quota.label).join(", "),
            plan: plan.name,
          })}
        </Notice>
      ) : null}

      <Grid columns={3}>
        <Card staticHover className="gap-3 border-accent bg-accent-tint">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <CardEyebrow accent>{t("currentPlan")}</CardEyebrow>
            <StatusBadge status={subscription?.status ?? "active"} />
          </div>
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-3xl leading-tight font-semibold tracking-tight">{plan.name}</span>
            <span className="text-sm text-fg-muted tabular-nums">
              {priceNow ? (
                <>
                  {formatCurrency(priceNow, plan.currency)} {yearly ? t("perYear") : t("perMonth")}
                </>
              ) : (
                t("noCharge")
              )}
            </span>
          </div>
          {cancelling ? <Badge tone="warn">{t("cancelsAtEnd")}</Badge> : null}
          <p className="m-0 text-sm text-fg-muted">
            {plan.limits.retentionDays === -1
              ? t("analyticsHistoryUnlimited")
              : t("analyticsHistoryDays", { days: plan.limits.retentionDays })}
          </p>
        </Card>

        <Card staticHover className="gap-3">
          <CardEyebrow>{t("nextInvoice")}</CardEyebrow>
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-3xl leading-tight font-semibold tracking-tight tabular-nums">
              {cancelling || !priceNow ? "—" : formatCurrency(priceNow, plan.currency)}
            </span>
            {!cancelling && priceNow ? (
              <span className="text-sm text-fg-muted">{yearly ? tc("yearly") : tc("monthly")}</span>
            ) : null}
          </div>
          <p className="m-0 text-sm text-fg-muted">
            {cancelling && periodEnd
              ? t("noFurtherCharges", { date: formatDate(periodEnd) })
              : periodEnd
                ? t("chargedOn", { date: formatDate(periodEnd) })
                : priceNow
                  ? t("noRenewalDate")
                  : context.isSuperadmin
                    ? t("infinityNeverCharges")
                    : t("freeNeverCharges")}
          </p>
          <p className="m-0 text-sm text-fg-muted">
            {yearly
              ? t("billingPeriodAnnual", { period: currentPeriod() })
              : t("billingPeriodMonthly", { period: currentPeriod() })}
          </p>
        </Card>

        <Card staticHover className="gap-3">
          <CardEyebrow>{t("paymentMethod")}</CardEyebrow>
          {account.paymentMethod ? (
            <>
              <div className="flex min-w-0 items-center gap-3 rounded-default border border-border bg-surface-subtle px-4 py-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-border bg-bg text-fg-muted"
                  aria-hidden="true"
                >
                  <Icon name="credit-card" className="text-sm" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium capitalize">
                    {account.paymentMethod.brand} ···· {account.paymentMethod.last4}
                  </span>
                  <span className="font-mono text-xs text-fg-subtle tabular-nums">
                    {t("cardExpires", { expiry: account.paymentMethod.expiry })}
                  </span>
                </span>
              </div>
              {canManage ? (
                <ManageBillingButton label={t("updateCard")} withIcon={false} />
              ) : (
                <p className="m-0 text-sm text-fg-muted">{t("ownerChangeCard")}</p>
              )}
            </>
          ) : (
            <>
              <div className="flex min-w-0 items-center gap-3 rounded-default border border-dashed border-border px-4 py-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-dashed border-border text-fg-disabled"
                  aria-hidden="true"
                >
                  <Icon name="credit-card" className="text-sm" />
                </span>
                <span className="min-w-0 text-sm text-fg-muted">{t("noCard")}</span>
              </div>
              <p className="m-0 text-sm text-fg-muted">
                {billingConfigured ? t("cardAtCheckout") : te("billing_disabled")}
              </p>
            </>
          )}
        </Card>
      </Grid>

      <Section
        title={t("usageThisPeriod")}
        description={usageSummary}
        actions={
          reached.length > 0 ? (
            <Badge tone="danger">{t("atLimit", { count: reached.length })}</Badge>
          ) : nearing.length > 0 ? (
            <Badge tone="warn">{t("nearLimit", { count: nearing.length })}</Badge>
          ) : (
            <Badge tone="muted">{t("healthy")}</Badge>
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
        {context.isSuperadmin ? (
          <Notice
            tone="info"
            icon={<Icon name="sparkles" className="text-sm" />}
            title={t("infinityStaff")}
          >
            {t("infinityStaffBody")}
          </Notice>
        ) : (
          <Section title={t("plans")} description={t("plansDescription")}>
            <PlanPicker
              plans={cards}
              currentPlan={activePlanKey}
              currentInterval={yearly ? "year" : "month"}
              canManage={canManage}
              hasBillingAccount={hasBillingAccount}
              stripeConfigured={billingConfigured}
            />
          </Section>
        )}
      </div>

      <Section
        title={t("invoices")}
        description={
          account.invoices.length > 0
            ? t("invoicesFromStripe", { count: account.invoices.length })
            : undefined
        }
      >
        {account.invoices.length === 0 ? (
          <EmptyState
            icon={<Icon name="download" className="text-lg" />}
            eyebrow={t("invoices")}
            title={t("noInvoicesTitle")}
            description={t("noInvoicesBody")}
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell scope="col">{t("colInvoice")}</TableHeaderCell>
                <TableHeaderCell scope="col">{t("colDate")}</TableHeaderCell>
                <TableHeaderCell scope="col" className="text-right">
                  {t("colAmount")}
                </TableHeaderCell>
                <TableHeaderCell scope="col">{t("colStatus")}</TableHeaderCell>
                <TableHeaderCell scope="col" className="text-right">
                  {t("colReceipt")}
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
                          aria-label={t("viewInvoice", { number: invoice.number })}
                        >
                          <Icon name="external-link" className="text-sm" aria-hidden="true" />
                          {t("view")}
                        </Button>
                      ) : null}
                      {invoice.pdfUrl ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          href={invoice.pdfUrl}
                          aria-label={t("downloadInvoice", { number: invoice.number })}
                        >
                          <Icon name="download" className="text-sm" aria-hidden="true" />
                          {t("pdf")}
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

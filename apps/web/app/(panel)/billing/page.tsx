import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Icon, type IconName } from "@/components/kit/icon";
import { PanelShell } from "@/components/shell/panel-shell";
import { StatusBadge } from "@/components/shell/status-badge";
import {
  Badge,
  Button,
  Callout,
  Card,
  EmptyState,
  InfoTip,
  KeyValue,
  PageHeader,
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

type SearchParams = Promise<{ checkout?: string }>;

export default async function BillingPage({ searchParams }: { searchParams: SearchParams }) {
  const context = await requireWorkspace();
  const { checkout } = await searchParams;
  const [t, tc] = await Promise.all([getTranslations("billing"), getTranslations("common")]);

  const billedUserId = context.billingOwner?.id ?? context.user.id;
  // Stripe actions (checkout, portal) act on the signed-in user's own customer record,
  // so only the billing owner gets them — a platform admin looking at someone else's
  // team would otherwise open their own portal.
  const canManage = context.isBillingOwner;
  // Invoices carry the billing owner's address and payment details, so team members
  // never load them; platform admins can read them for support.
  const canSeeInvoices = context.isBillingOwner || context.isSuperadmin;

  const [subscription, allPlanRows, usage] = await Promise.all([
    getSubscription(billedUserId),
    // Hidden plans included: a subscriber on a retired plan keeps it, and the page must
    // still show its price and renewal instead of "No charge".
    listPlans(true),
    getWorkspaceUsage(context.workspace.id),
  ]);

  // `usage_counters` is refreshed by the cron; reading ClickHouse directly here keeps the
  // number live for someone deciding whether to upgrade.
  const [clicks, account, billingConfigured] = await Promise.all([
    loadMonthlyClicks(context.workspace.id, currentPeriod(), usage.clicksThisMonth),
    getBillingAccount(canSeeInvoices ? (subscription?.stripeCustomerId ?? null) : null),
    stripeEnabled(),
  ]);

  const plan = context.plan;
  const activePlanKey = context.isSuperadmin ? "infinity" : (subscription?.planKey ?? "free");
  const planRows = allPlanRows.filter((row) => row.visible || row.key === activePlanKey);
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

  const activeRow = planRows.find((row) => row.key === activePlanKey);
  const yearly = subscription?.interval === "year";
  const priceNow = yearly ? activeRow?.priceYearly : activeRow?.priceMonthly;
  const pastDue = subscription?.status === "past_due";
  const hasBillingAccount = Boolean(subscription?.stripeCustomerId);
  const cancelling = Boolean(subscription?.cancelAtPeriodEnd);
  const periodEnd = subscription?.currentPeriodEnd ?? null;
  const ownerName = context.billingOwner?.name ?? "";

  const quotas: Array<{ key: string; label: string; info: string; used: number; limit: number }> = [
    { key: "links", label: t("limitLinks"), info: t("infoLinks"), used: usage.links, limit: plan.limits.links },
    {
      key: "clicks",
      label: t("clicksThisMonth"),
      info: t("infoClicks"),
      used: clicks,
      limit: plan.limits.clicksPerMonth,
    },
    {
      key: "domains",
      label: t("customDomains"),
      info: t("infoDomains"),
      used: usage.customDomains,
      limit: plan.limits.customDomains,
    },
    { key: "bio", label: t("limitBio"), info: t("infoBio"), used: usage.biopages, limit: plan.limits.biopages },
    { key: "qr", label: t("limitQr"), info: t("infoQr"), used: usage.qrCodes, limit: plan.limits.qrCodes },
    {
      key: "members",
      label: t("teamMembers"),
      info: t("infoMembers"),
      used: usage.members,
      limit: plan.limits.members,
    },
    { key: "teams", label: t("limitTeams"), info: t("infoTeams"), used: usage.teams, limit: plan.limits.teams },
  ];

  const metered = quotas.filter((quota) => quota.limit !== -1 && quota.limit > 0);
  const reached = metered.filter((quota) => quota.used >= quota.limit);
  const nearing = metered.filter((quota) => quota.used < quota.limit && quota.used / quota.limit >= 0.85);

  // Only escalate when the numbers actually justify it — a permanent warning teaches
  // people to ignore the banner.
  const usageSummary =
    reached.length > 0
      ? t("limitsReachedSummary", { reached: reached.length, total: metered.length })
      : nearing.length > 0
        ? t("limitsNearSummary", { nearing: nearing.length, total: metered.length })
        : t("usageHealthy");

  let nextPaymentLabel = t("kvNextPayment");
  let nextPaymentValue: string;
  if (cancelling && periodEnd) {
    nextPaymentLabel = t("kvAccessUntil");
    nextPaymentValue = formatDate(periodEnd);
  } else if (priceNow && periodEnd) {
    nextPaymentValue = t("kvNextPaymentValue", {
      amount: formatCurrency(priceNow, plan.currency),
      date: formatDate(periodEnd),
    });
  } else if (priceNow) {
    nextPaymentValue = t("noRenewalDate");
  } else {
    nextPaymentValue = t("kvNone");
  }

  const how: Array<{ icon: IconName; title: string; body: string }> = [
    { icon: "arrow-trend-up", title: t("howUpgradeTitle"), body: t("howUpgradeBody") },
    { icon: "arrow-down", title: t("howDowngradeTitle"), body: t("howDowngradeBody") },
    { icon: "calendar", title: t("howCancelTitle"), body: t("howCancelBody") },
    { icon: "credit-card", title: t("howFailedTitle"), body: t("howFailedBody") },
  ];

  const headerAction =
    canManage && hasBillingAccount ? (
      <ManageBillingButton size="md" variant="primary" label={t("manageBilling")} />
    ) : canManage && !context.isSuperadmin && activePlanKey === "free" ? (
      <Button variant="primary" leadingIcon="rocket" href="#plans">
        {t("seeUpgrades")}
      </Button>
    ) : null;

  return (
    <PanelShell title={t("title")} crumbs={[{ label: context.workspace.name }]}>
      <PageHeader
        title={t("title")}
        meta={<Badge tone="accent">{plan.name}</Badge>}
        description={t("pageDesc")}
        actions={headerAction}
      />

      {!canManage && context.billingOwner && !context.isBillingOwner ? (
        <Callout tone="info" title={t("billedToTitle")}>
          {t("billedToBody", { name: ownerName })}
        </Callout>
      ) : null}

      {checkout === "success" ? (
        <Callout
          tone="success"
          title={t("paymentReceived")}
          actions={
            <Button size="sm" href="/links">
              {t("backToLinks")}
            </Button>
          }
        >
          {t("planActive")}
        </Callout>
      ) : null}

      {checkout === "cancelled" ? (
        <Callout
          tone="info"
          title={t("checkoutCancelled")}
          actions={
            <Button size="sm" href="#plans">
              {t("seePlansAgain")}
            </Button>
          }
        >
          {t("nothingCharged")}
        </Callout>
      ) : null}

      {pastDue ? (
        <Callout
          tone="danger"
          title={t("paymentFailed")}
          actions={
            canManage ? (
              <ManageBillingButton variant="primary" label={t("updateCard")} />
            ) : (
              <Badge tone="danger">{t("ownerAction")}</Badge>
            )
          }
        >
          {t("paymentFailedBody")}
        </Callout>
      ) : null}

      {cancelling && periodEnd ? (
        <Callout
          tone="warn"
          icon="calendar"
          title={t("planEnds", { name: plan.name, date: formatDate(periodEnd) })}
          actions={canManage ? <ManageBillingButton label={t("resumePlan")} /> : null}
        >
          {t("planEndsBody")}
        </Callout>
      ) : null}

      {reached.length > 0 ? (
        <Callout
          tone="danger"
          icon="gauge-high"
          title={reached.length === 1 ? t("oneLimitReached") : t("limitsReached", { count: reached.length })}
          actions={
            canManage && !context.isSuperadmin ? (
              <Button size="sm" variant="primary" leadingIcon="arrow-trend-up" href="#plans">
                {t("comparePlans")}
              </Button>
            ) : null
          }
        >
          {t("cannotAddMore", {
            labels: reached.map((quota) => quota.label).join(", "),
            plan: plan.name,
          })}
        </Callout>
      ) : null}

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-start">
        <Card
          title={t("currentPlanTitle")}
          actions={<StatusBadge status={subscription?.status ?? "active"} />}
          className={pastDue ? undefined : "border-accent-border"}
          footer={
            canManage && hasBillingAccount ? (
              <>
                <span className="min-w-0 text-[13px] text-fg-subtle">{t("opensStripe")}</span>
                <ManageBillingButton label={t("manageBilling")} />
              </>
            ) : canManage && !context.isSuperadmin ? (
              <>
                <span className="min-w-0 text-[13px] text-fg-subtle">{t("changeAnytime")}</span>
                <Button size="sm" href="#plans" trailingIcon="arrow-right">
                  {t("comparePlans")}
                </Button>
              </>
            ) : null
          }
        >
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[28px] leading-9 font-semibold tracking-[-0.02em] text-ink">{plan.name}</span>
            <span className="numeric text-sm text-fg-muted">
              {priceNow
                ? `${formatCurrency(priceNow, plan.currency)} ${yearly ? t("perYear") : t("perMonth")}`
                : t("noCharge")}
            </span>
          </div>
          {cancelling ? (
            <span>
              <Badge tone="warn">{t("cancelsAtEnd")}</Badge>
            </span>
          ) : null}
          <KeyValue
            className="mt-2"
            items={[
              {
                id: "cycle",
                label: t("kvCycle"),
                value: priceNow ? (yearly ? tc("yearly") : tc("monthly")) : "—",
              },
              { id: "next", label: nextPaymentLabel, value: nextPaymentValue },
              {
                id: "history",
                label: t("kvHistory"),
                info: t("kvHistoryInfo"),
                value:
                  plan.limits.retentionDays === -1
                    ? tc("unlimited")
                    : tc("days", { count: plan.limits.retentionDays }),
              },
            ]}
          />
        </Card>

        <Card
          title={t("usageThisPeriod")}
          description={usageSummary}
          actions={
            reached.length > 0 ? (
              <Badge tone="danger" dot>
                {t("atLimit", { count: reached.length })}
              </Badge>
            ) : nearing.length > 0 ? (
              <Badge tone="warn" dot>
                {t("nearLimit", { count: nearing.length })}
              </Badge>
            ) : (
              <Badge tone="success" dot>
                {t("healthy")}
              </Badge>
            )
          }
        >
          <div className="grid min-w-0 gap-x-8 gap-y-5 pt-1 sm:grid-cols-2">
            {quotas.map((quota) =>
              quota.limit === 0 ? (
                // Not part of the plan at all: a red "limit reached" bar would read as a problem.
                <div key={quota.key} className="flex min-w-0 flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-1.5 text-sm text-fg-muted">
                      <span className="truncate">{quota.label}</span>
                      <InfoTip label={quota.label}>{quota.info}</InfoTip>
                    </span>
                    <Badge tone="neutral" size="sm">
                      {t("notIncluded")}
                    </Badge>
                  </div>
                  <span className="text-xs text-fg-subtle">
                    {canManage && !context.isSuperadmin ? t("notIncludedHint") : t("notIncludedOwner")}
                  </span>
                </div>
              ) : (
                <QuotaMeter
                  key={quota.key}
                  label={quota.label}
                  info={quota.info}
                  used={quota.used}
                  limit={quota.limit}
                  upgradeHref={canManage && !context.isSuperadmin ? "#plans" : undefined}
                />
              ),
            )}
          </div>
        </Card>
      </div>

      <div id="plans" className="flex min-w-0 scroll-mt-20 flex-col gap-6">
        {context.isSuperadmin ? (
          <Callout tone="accent" icon="sparkles" title={t("infinityStaff")}>
            {t("infinityStaffBody")}
          </Callout>
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

      {context.isSuperadmin ? null : (
        <Card title={t("howTitle")} description={t("howDesc")}>
          <div className="grid min-w-0 gap-x-8 gap-y-5 pt-1 sm:grid-cols-2">
            {how.map((item) => (
              <div key={item.title} className="flex min-w-0 items-start gap-3">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-default bg-surface text-fg-muted"
                  aria-hidden="true"
                >
                  <Icon name={item.icon} className="text-xs" />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium text-ink">{item.title}</span>
                  <p className="m-0 text-[13px] leading-5 text-fg-muted">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card
        padding="none"
        title={t("invoices")}
        description={
          canSeeInvoices && account.invoices.length > 0
            ? t("invoicesFromStripe", { count: account.invoices.length })
            : t("invoicesDesc")
        }
        actions={
          canManage && hasBillingAccount && account.invoices.length > 0 ? (
            <ManageBillingButton variant="ghost" withIcon={false} label={t("billingDetails")} />
          ) : null
        }
      >
        {!canSeeInvoices ? (
          <EmptyState
            bare
            size="sm"
            icon="lock"
            title={t("invoicesOwnerTitle")}
            description={t("invoicesOwnerBody", { name: ownerName })}
          />
        ) : account.invoices.length === 0 ? (
          <EmptyState
            bare
            size="sm"
            icon="file-lines"
            title={t("noInvoicesTitle")}
            description={t("noInvoicesBody")}
          />
        ) : (
          <Table bare label={t("invoices")}>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("colInvoice")}</TableHeaderCell>
                <TableHeaderCell>{t("colDate")}</TableHeaderCell>
                <TableHeaderCell numeric>{t("colAmount")}</TableHeaderCell>
                <TableHeaderCell>{t("colStatus")}</TableHeaderCell>
                <TableHeaderCell align="right">{t("colReceipt")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {account.invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-[13px]">
                    <span className="block max-w-40 truncate">{invoice.number}</span>
                  </TableCell>
                  <TableCell className="numeric whitespace-nowrap text-fg-muted">
                    {formatDate(invoice.created)}
                  </TableCell>
                  <TableCell numeric>{formatCurrency(invoice.amount, invoice.currency)}</TableCell>
                  <TableCell>
                    <StatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell align="right">
                    <span className="flex justify-end gap-1">
                      {invoice.hostedUrl ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          leadingIcon="external-link"
                          href={invoice.hostedUrl}
                          external
                          aria-label={t("viewInvoice", { number: invoice.number })}
                        >
                          {t("view")}
                        </Button>
                      ) : null}
                      {invoice.pdfUrl ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          leadingIcon="download"
                          href={invoice.pdfUrl}
                          external
                          aria-label={t("downloadInvoice", { number: invoice.number })}
                        >
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
      </Card>
    </PanelShell>
  );
}

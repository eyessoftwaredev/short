import { getMonthlyClickTotal } from "@short/analytics";
import { getPlan, type PlanDefinition, type PlanKey } from "@short/core";
import {
  and,
  eq,
  getDb,
  organization,
  plans,
  sql,
  subscriptions,
  usageCounters,
  user,
  type PlanRow,
  type SubscriptionRow,
} from "@short/db";
import { currentPeriod } from "./quota";
import { getStripe, stripeEnabled } from "./stripe";
import { getPersonalWorkspaceId, getWorkspaceOwnerId } from "./workspace";

export type BillingPlan = PlanRow & { definition: PlanDefinition };

export async function listPlans(includeHidden = false): Promise<BillingPlan[]> {
  const rows = await getDb().select().from(plans).orderBy(plans.sortOrder);
  return rows
    .filter((row) => includeHidden || row.visible)
    .map((row) => ({ ...row, definition: getPlan(row.key) }));
}

export async function getSubscription(userId: string): Promise<SubscriptionRow | null> {
  const [row] = await getDb()
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return row ?? null;
}

/**
 * Click totals live in ClickHouse; `usage_counters` is the durable mirror the quota
 * checks and invoices read. Called on demand by the billing page and by the cron route.
 */
export async function syncClickUsage(workspaceId: string, period = currentPeriod()): Promise<number> {
  const clicks = await getMonthlyClickTotal(workspaceId, period);

  await getDb()
    .insert(usageCounters)
    .values({ workspaceId, period, clicksTracked: clicks })
    .onConflictDoUpdate({
      target: [usageCounters.workspaceId, usageCounters.period],
      set: { clicksTracked: clicks, syncedAt: new Date() },
    });

  return clicks;
}

export async function getPeriodUsage(
  workspaceId: string,
  period = currentPeriod(),
): Promise<{ clicks: number; links: number; apiRequests: number }> {
  const [row] = await getDb()
    .select()
    .from(usageCounters)
    .where(and(eq(usageCounters.workspaceId, workspaceId), eq(usageCounters.period, period)))
    .limit(1);

  return {
    clicks: row?.clicksTracked ?? 0,
    links: row?.linksCreated ?? 0,
    apiRequests: row?.apiRequests ?? 0,
  };
}

export async function incrementLinksCreated(workspaceId: string): Promise<void> {
  await getDb()
    .insert(usageCounters)
    .values({ workspaceId, period: currentPeriod(), linksCreated: 1 })
    .onConflictDoUpdate({
      target: [usageCounters.workspaceId, usageCounters.period],
      set: { linksCreated: sql`${usageCounters.linksCreated} + 1` },
    });
}

export async function incrementApiRequests(workspaceId: string, by = 1): Promise<void> {
  await getDb()
    .insert(usageCounters)
    .values({ workspaceId, period: currentPeriod(), apiRequests: by })
    .onConflictDoUpdate({
      target: [usageCounters.workspaceId, usageCounters.period],
      set: { apiRequests: sql`${usageCounters.apiRequests} + ${by}` },
    });
}

export type SubscriptionUpsert = {
  userId: string;
  planKey: PlanKey;
  status: string;
  interval: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

export async function assignUserPlan(userId: string, planKey: PlanKey): Promise<boolean> {
  const [catalogue] = await getDb()
    .select({ key: plans.key })
    .from(plans)
    .where(eq(plans.key, planKey))
    .limit(1);
  if (!catalogue) {
    return false;
  }

  const current = await getSubscription(userId);
  await upsertSubscription({
    userId,
    planKey,
    status: "active",
    interval: current?.interval ?? "month",
    stripeCustomerId: current?.stripeCustomerId ?? null,
    stripeSubscriptionId: current?.stripeSubscriptionId ?? null,
    currentPeriodStart: current?.currentPeriodStart ?? null,
    currentPeriodEnd: current?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: false,
  });
  return true;
}

/** Assigns the plan to the workspace owner's account. */
export async function assignWorkspacePlan(
  workspaceId: string,
  planKey: PlanKey,
): Promise<boolean> {
  const ownerId = await getWorkspaceOwnerId(workspaceId);
  if (!ownerId) {
    return false;
  }
  return assignUserPlan(ownerId, planKey);
}

export async function grantInfinityToUser(userId: string): Promise<void> {
  await assignUserPlan(userId, "infinity");
}

export async function upsertSubscription(values: SubscriptionUpsert): Promise<void> {
  await getDb()
    .insert(subscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        planKey: values.planKey,
        status: values.status,
        interval: values.interval,
        stripeCustomerId: values.stripeCustomerId,
        stripeSubscriptionId: values.stripeSubscriptionId,
        currentPeriodStart: values.currentPeriodStart,
        currentPeriodEnd: values.currentPeriodEnd,
        cancelAtPeriodEnd: values.cancelAtPeriodEnd,
        updatedAt: new Date(),
      },
    });
}

/** Resolves the billed user a Stripe customer belongs to, for webhook handling. */
export async function userForCustomer(customerId: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1);
  return row?.userId ?? null;
}

export async function auditWorkspaceForUser(userId: string): Promise<string | null> {
  return getPersonalWorkspaceId(userId);
}

export async function planForStripePrice(priceId: string): Promise<{
  key: PlanKey;
  interval: "month" | "year";
} | null> {
  const rows = await getDb().select().from(plans);

  for (const row of rows) {
    if (row.stripePriceMonthlyId === priceId) {
      return { key: row.key, interval: "month" };
    }
    if (row.stripePriceYearlyId === priceId) {
      return { key: row.key, interval: "year" };
    }
  }
  return null;
}

export type InvoiceView = {
  id: string;
  number: string;
  created: Date;
  amountPaid: number;
  currency: string;
  status: string;
  pdfUrl: string | null;
  hostedUrl: string | null;
};

export type BillingAccount = {
  invoices: InvoiceView[];
};

/**
 * Invoices are never mirrored into Postgres — Stripe stays the source of truth
 * and an outage degrades to an empty list instead of a broken page. Cards live
 * in the Customer Portal, not this panel.
 */
export async function getBillingAccount(customerId: string | null): Promise<BillingAccount> {
  if (!customerId || !(await stripeEnabled())) {
    return { invoices: [] };
  }

  try {
    const stripe = await getStripe();
    const invoices = await stripe.invoices.list({ customer: customerId, limit: 12 });

    return {
      invoices: invoices.data.map((invoice) => ({
        id: invoice.id ?? "",
        number: invoice.number ?? invoice.id ?? "",
        created: new Date(invoice.created * 1000),
        amountPaid: invoice.amount_paid,
        currency: invoice.currency.toUpperCase(),
        status: invoice.status ?? "draft",
        pdfUrl: invoice.invoice_pdf ?? null,
        hostedUrl: invoice.hosted_invoice_url ?? null,
      })),
    };
  } catch (error) {
    console.error("getBillingAccount failed", error);
    return { invoices: [] };
  }
}

export async function getWorkspaceName(workspaceId: string): Promise<string> {
  const [row] = await getDb()
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, workspaceId))
    .limit(1);
  return row?.name ?? "Workspace";
}

export async function getUserDisplayName(userId: string): Promise<string> {
  const [row] = await getDb()
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  const name = row?.name.trim() ?? "";
  return name === "" ? (row?.email ?? "Account") : name;
}

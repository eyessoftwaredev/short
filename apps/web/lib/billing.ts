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
  type PlanRow,
  type SubscriptionRow,
} from "@short/db";
import { currentPeriod } from "./quota";
import { getStripe, stripeEnabled } from "./stripe";

export type BillingPlan = PlanRow & { definition: PlanDefinition };

export async function listPlans(includeHidden = false): Promise<BillingPlan[]> {
  const rows = await getDb().select().from(plans).orderBy(plans.sortOrder);
  return rows
    .filter((row) => includeHidden || row.visible)
    .map((row) => ({ ...row, definition: getPlan(row.key) }));
}

export async function getSubscription(workspaceId: string): Promise<SubscriptionRow | null> {
  const [row] = await getDb()
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.workspaceId, workspaceId))
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
  workspaceId: string;
  planKey: PlanKey;
  status: string;
  interval: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

export async function upsertSubscription(values: SubscriptionUpsert): Promise<void> {
  await getDb()
    .insert(subscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: subscriptions.workspaceId,
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

/** Resolves the workspace a Stripe customer belongs to, for webhook handling. */
export async function workspaceForCustomer(customerId: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ workspaceId: subscriptions.workspaceId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1);
  return row?.workspaceId ?? null;
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

export type PaymentMethodView = {
  brand: string;
  last4: string;
  expiry: string;
};

export type BillingAccount = {
  invoices: InvoiceView[];
  paymentMethod: PaymentMethodView | null;
};

/**
 * Invoices and cards are never mirrored into Postgres — Stripe stays the source of
 * truth and an outage degrades to an empty list instead of a broken page.
 */
export async function getBillingAccount(customerId: string | null): Promise<BillingAccount> {
  if (!customerId || !stripeEnabled()) {
    return { invoices: [], paymentMethod: null };
  }

  try {
    const stripe = getStripe();
    const [invoices, customer] = await Promise.all([
      stripe.invoices.list({ customer: customerId, limit: 12 }),
      stripe.customers.retrieve(customerId, { expand: ["invoice_settings.default_payment_method"] }),
    ]);

    const defaultMethod =
      !customer.deleted && typeof customer.invoice_settings?.default_payment_method === "object"
        ? customer.invoice_settings.default_payment_method
        : null;
    const card = defaultMethod?.card ?? null;

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
      paymentMethod: card
        ? {
            brand: card.brand,
            last4: card.last4,
            expiry: `${String(card.exp_month).padStart(2, "0")}/${String(card.exp_year).slice(-2)}`,
          }
        : null,
    };
  } catch (error) {
    console.error("getBillingAccount failed", error);
    return { invoices: [], paymentMethod: null };
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

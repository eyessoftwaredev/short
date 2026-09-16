"use server";

import { isInternalPlan, PLAN_KEYS, type PlanKey } from "@short/core";
import { eq, getDb, plans } from "@short/db";
import { fail, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { getSubscription, getUserDisplayName, syncClickUsage, upsertSubscription } from "@/lib/billing";
import { serverEnv } from "@/lib/env";
import { requireWorkspace, requireWorkspaceRole } from "@/lib/session";
import { getStripe, stripeEnabled } from "@/lib/stripe";

type Interval = "month" | "year";

/**
 * Creates a Checkout session for an upgrade. The subscription row is not touched here:
 * the `checkout.session.completed` webhook is the single writer, so a closed tab or a
 * failed card never leaves the workspace on a plan it did not pay for.
 */
export async function startCheckoutAction(
  planKey: string,
  interval: Interval,
): Promise<ActionResult<{ url: string }>> {
  try {
    const context = await requireWorkspace();
    if (!context.isBillingOwner && !context.isSuperadmin) {
      return fail("owner_billing");
    }

    if (!(await stripeEnabled())) {
      return fail("billing_disabled");
    }
    if (!PLAN_KEYS.includes(planKey as PlanKey) || planKey === "free" || isInternalPlan(planKey)) {
      return fail("pick_paid_plan");
    }

    const [plan] = await getDb()
      .select()
      .from(plans)
      .where(eq(plans.key, planKey as PlanKey))
      .limit(1);

    const priceId = interval === "year" ? plan?.stripePriceYearlyId : plan?.stripePriceMonthlyId;
    if (!plan || !priceId) {
      return fail("plan_no_price");
    }

    const stripe = await getStripe();
    const subscription = await getSubscription(context.user.id);
    const appUrl = serverEnv().APP_URL.replace(/\/$/, "");

    let customerId = subscription?.stripeCustomerId ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: context.user.email,
        name: await getUserDisplayName(context.user.id),
        metadata: { userId: context.user.id },
      });
      customerId = customer.id;
      await upsertSubscription({
        userId: context.user.id,
        planKey: (subscription?.planKey ?? "free") as PlanKey,
        status: subscription?.status ?? "active",
        interval: subscription?.interval ?? "month",
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription?.stripeSubscriptionId ?? null,
        currentPeriodStart: subscription?.currentPeriodStart ?? null,
        currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      customer_update: { address: "auto", name: "auto" },
      client_reference_id: context.user.id,
      subscription_data: {
        metadata: { userId: context.user.id, planKey: plan.key },
      },
      success_url: `${appUrl}/billing?checkout=success`,
      cancel_url: `${appUrl}/billing?checkout=cancelled`,
    });

    if (!session.url) {
      return fail("checkout_url");
    }

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "billing.checkout",
      targetType: "subscription",
      metadata: { planKey: plan.key, interval },
    });

    return ok({ url: session.url });
  } catch (error) {
    return toActionError(error);
  }
}

export async function openPortalAction(): Promise<ActionResult<{ url: string }>> {
  try {
    const context = await requireWorkspace();
    if (!context.isBillingOwner && !context.isSuperadmin) {
      return fail("owner_billing");
    }

    if (!(await stripeEnabled())) {
      return fail("billing_disabled");
    }

    const subscription = await getSubscription(context.user.id);
    if (!subscription?.stripeCustomerId) {
      return fail("no_billing_account");
    }

    const session = await (await getStripe()).billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${serverEnv().APP_URL.replace(/\/$/, "")}/billing`,
    });

    return ok({ url: session.url });
  } catch (error) {
    return toActionError(error);
  }
}

export async function syncUsageAction(): Promise<ActionResult<{ clicks: number }>> {
  try {
    const context = await requireWorkspaceRole("admin");
    const clicks = await syncClickUsage(context.workspace.id);
    return ok({ clicks });
  } catch (error) {
    return toActionError(error);
  }
}

"use server";

import { PLAN_KEYS, type PlanKey } from "@short/core";
import { eq, getDb, plans } from "@short/db";
import { fail, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { getSubscription, getWorkspaceName, syncClickUsage, upsertSubscription } from "@/lib/billing";
import { serverEnv } from "@/lib/env";
import { requireWorkspaceRole } from "@/lib/session";
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
    const context = await requireWorkspaceRole("owner");

    if (!stripeEnabled()) {
      return fail("Billing is not configured on this deployment.");
    }
    if (!PLAN_KEYS.includes(planKey as PlanKey) || planKey === "free") {
      return fail("Pick a paid plan to continue.");
    }

    const [plan] = await getDb()
      .select()
      .from(plans)
      .where(eq(plans.key, planKey as PlanKey))
      .limit(1);

    const priceId = interval === "year" ? plan?.stripePriceYearlyId : plan?.stripePriceMonthlyId;
    if (!plan || !priceId) {
      return fail("This plan has no price configured yet. Contact support.");
    }

    const stripe = getStripe();
    const subscription = await getSubscription(context.workspace.id);
    const appUrl = serverEnv().APP_URL.replace(/\/$/, "");

    let customerId = subscription?.stripeCustomerId ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: context.user.email,
        name: await getWorkspaceName(context.workspace.id),
        metadata: { workspaceId: context.workspace.id },
      });
      customerId = customer.id;
      await upsertSubscription({
        workspaceId: context.workspace.id,
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
      client_reference_id: context.workspace.id,
      subscription_data: {
        metadata: { workspaceId: context.workspace.id, planKey: plan.key },
      },
      success_url: `${appUrl}/billing?checkout=success`,
      cancel_url: `${appUrl}/billing?checkout=cancelled`,
    });

    if (!session.url) {
      return fail("Stripe did not return a checkout URL.");
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
    const context = await requireWorkspaceRole("owner");

    if (!stripeEnabled()) {
      return fail("Billing is not configured on this deployment.");
    }

    const subscription = await getSubscription(context.workspace.id);
    if (!subscription?.stripeCustomerId) {
      return fail("There is no billing account yet. Start a subscription first.");
    }

    const session = await getStripe().billingPortal.sessions.create({
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

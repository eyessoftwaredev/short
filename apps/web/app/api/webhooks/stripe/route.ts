import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import type { PlanKey } from "@short/core";
import { recordAudit } from "@/lib/audit";
import { planForStripePrice, upsertSubscription, workspaceForCustomer } from "@/lib/billing";
import { serverEnv } from "@/lib/env";
import { getStripe, stripeEnabled, toSubscriptionStatus } from "@/lib/stripe";

export const runtime = "nodejs";
/** Stripe signs the exact bytes, so the body must never be parsed or cached. */
export const dynamic = "force-dynamic";

function periodDate(value: number | null | undefined): Date | null {
  return typeof value === "number" ? new Date(value * 1000) : null;
}

function customerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!value) {
    return null;
  }
  return typeof value === "string" ? value : value.id;
}

async function applySubscription(subscription: Stripe.Subscription): Promise<void> {
  const stripeCustomerId = customerId(subscription.customer);
  if (!stripeCustomerId) {
    return;
  }

  const workspaceId =
    subscription.metadata.workspaceId ?? (await workspaceForCustomer(stripeCustomerId));
  if (!workspaceId) {
    return;
  }

  const item = subscription.items.data[0];
  const priceId = item?.price.id ?? null;
  const mapped = priceId ? await planForStripePrice(priceId) : null;

  // A cancelled or unpaid subscription drops the workspace back to free rather than
  // leaving paid limits in place.
  const status = toSubscriptionStatus(subscription.status);
  const downgraded = status === "canceled";
  const planKey: PlanKey = downgraded ? "free" : (mapped?.key ?? "free");

  await upsertSubscription({
    workspaceId,
    planKey,
    status,
    interval: mapped?.interval ?? "month",
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    currentPeriodStart: periodDate(item?.current_period_start),
    currentPeriodEnd: periodDate(item?.current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  await recordAudit({
    workspaceId,
    actorId: null,
    action: "billing.subscription",
    targetType: "subscription",
    targetId: subscription.id,
    metadata: { planKey, status },
  });
}

export async function POST(request: NextRequest) {
  if (!stripeEnabled()) {
    return NextResponse.json({ error: "billing_disabled" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  const secret = serverEnv().STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (typeof session.subscription === "string") {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          // Checkout knows the workspace; the subscription object may not yet.
          if (!subscription.metadata.workspaceId && session.client_reference_id) {
            subscription.metadata.workspaceId = session.client_reference_id;
          }
          await applySubscription(subscription);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await applySubscription(event.data.object);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const stripeCustomerId = customerId(invoice.customer);
        const workspaceId = stripeCustomerId
          ? await workspaceForCustomer(stripeCustomerId)
          : null;
        if (workspaceId) {
          await recordAudit({
            workspaceId,
            actorId: null,
            action: "billing.payment_failed",
            targetType: "invoice",
            targetId: invoice.id ?? null,
            metadata: { amountDue: invoice.amount_due },
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    // A 500 makes Stripe retry with backoff, which is the behaviour we want for a
    // transient database failure.
    console.error("stripe webhook failed", event.type, error);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

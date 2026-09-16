import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import type { PlanKey } from "@short/core";
import { recordAudit } from "@/lib/audit";
import {
  auditWorkspaceForUser,
  planForStripePrice,
  upsertSubscription,
  userForCustomer,
} from "@/lib/billing";
import { getStripe, getStripeCredentials, toSubscriptionStatus } from "@/lib/stripe";
import { getWorkspaceOwnerId } from "@/lib/workspace";

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

async function resolveUserId(
  subscription: Stripe.Subscription,
  stripeCustomerId: string,
): Promise<string | null> {
  if (subscription.metadata.userId) {
    return subscription.metadata.userId;
  }
  const fromCustomer = await userForCustomer(stripeCustomerId);
  if (fromCustomer) {
    return fromCustomer;
  }
  if (subscription.metadata.workspaceId) {
    return getWorkspaceOwnerId(subscription.metadata.workspaceId);
  }
  return null;
}

async function applySubscription(subscription: Stripe.Subscription): Promise<void> {
  const stripeCustomerId = customerId(subscription.customer);
  if (!stripeCustomerId) {
    return;
  }

  const userId = await resolveUserId(subscription, stripeCustomerId);
  if (!userId) {
    return;
  }

  const item = subscription.items.data[0];
  const priceId = item?.price.id ?? null;
  const mapped = priceId ? await planForStripePrice(priceId) : null;

  // A cancelled or unpaid subscription drops the account back to free rather than
  // leaving paid limits in place.
  const status = toSubscriptionStatus(subscription.status);
  const downgraded = status === "canceled";
  const planKey: PlanKey = downgraded ? "free" : (mapped?.key ?? "free");

  await upsertSubscription({
    userId,
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
    workspaceId: await auditWorkspaceForUser(userId),
    actorId: null,
    action: "billing.subscription",
    targetType: "subscription",
    targetId: subscription.id,
    metadata: { planKey, status, userId },
  });
}

export async function POST(request: NextRequest) {
  const creds = await getStripeCredentials();
  if (!creds) {
    return NextResponse.json({ error: "billing_disabled" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const stripe = await getStripe();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, creds.webhookSecret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (typeof session.subscription === "string") {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          if (!subscription.metadata.userId && session.client_reference_id) {
            subscription.metadata.userId = session.client_reference_id;
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
        const userId = stripeCustomerId ? await userForCustomer(stripeCustomerId) : null;
        if (userId) {
          await recordAudit({
            workspaceId: await auditWorkspaceForUser(userId),
            actorId: null,
            action: "billing.payment_failed",
            targetType: "invoice",
            targetId: invoice.id ?? null,
            metadata: { amountDue: invoice.amount_due, userId },
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

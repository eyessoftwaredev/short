import Stripe from "stripe";
import { features, serverEnv } from "./env";

let cached: Stripe | null = null;

export function stripeEnabled(): boolean {
  return features().stripe;
}

export function getStripe(): Stripe {
  if (!cached) {
    const key = serverEnv().STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing)");
    }
    cached = new Stripe(key, { typescript: true });
  }
  return cached;
}

/** Maps Stripe's subscription status onto the values the panel renders. */
export function toSubscriptionStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "incomplete":
      return status;
    case "incomplete_expired":
    case "unpaid":
      return "past_due";
    default:
      return "incomplete";
  }
}

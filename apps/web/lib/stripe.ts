import Stripe from "stripe";
import { eq, getDb, PLATFORM_SETTINGS_ID, platformSettings } from "@short/db";
import { serverEnv } from "./env";
import { decryptSecret } from "./secret";

export type StripeCredentialSource = "database" | "env";

export type StripeCredentials = {
  secretKey: string;
  webhookSecret: string;
  publishableKey: string | null;
  livemode: boolean | null;
  source: StripeCredentialSource;
};

export type StripeStatus = {
  configured: boolean;
  source: StripeCredentialSource | null;
  livemode: boolean | null;
  publishableLast4: string | null;
};

type SettingsRow = {
  stripeSecretEnc: string | null;
  stripeWebhookSecretEnc: string | null;
  stripePublishableKey: string | null;
  stripeLivemode: boolean | null;
};

let cachedClient: Stripe | null = null;
let cachedSecret: string | null = null;
let cachedCreds: StripeCredentials | null = null;

export function clearStripeCache(): void {
  cachedClient = null;
  cachedSecret = null;
  cachedCreds = null;
}

function inferLivemode(secretKey: string): boolean | null {
  if (secretKey.startsWith("sk_live_") || secretKey.startsWith("rk_live_")) {
    return true;
  }
  if (secretKey.startsWith("sk_test_") || secretKey.startsWith("rk_test_")) {
    return false;
  }
  return null;
}

export function publishableLast4(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length < 4 ? trimmed : trimmed.slice(-4);
}

async function loadSettingsRow(): Promise<SettingsRow | null> {
  try {
    const [row] = await getDb()
      .select({
        stripeSecretEnc: platformSettings.stripeSecretEnc,
        stripeWebhookSecretEnc: platformSettings.stripeWebhookSecretEnc,
        stripePublishableKey: platformSettings.stripePublishableKey,
        stripeLivemode: platformSettings.stripeLivemode,
      })
      .from(platformSettings)
      .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID))
      .limit(1);
    return row ?? null;
  } catch (error) {
    console.error("load Stripe settings failed", error);
    return null;
  }
}

function credentialsFromEnv(): StripeCredentials | null {
  const env = serverEnv();
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return null;
  }
  return {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    publishableKey: null,
    livemode: inferLivemode(env.STRIPE_SECRET_KEY),
    source: "env",
  };
}

function credentialsFromRow(row: SettingsRow): StripeCredentials | null {
  if (!row.stripeSecretEnc || !row.stripeWebhookSecretEnc) {
    return null;
  }
  try {
    const secretKey = decryptSecret(row.stripeSecretEnc);
    const webhookSecret = decryptSecret(row.stripeWebhookSecretEnc);
    return {
      secretKey,
      webhookSecret,
      publishableKey: row.stripePublishableKey,
      livemode: row.stripeLivemode ?? inferLivemode(secretKey),
      source: "database",
    };
  } catch (error) {
    console.error("decrypt Stripe settings failed", error);
    return null;
  }
}

export async function getStripeCredentials(): Promise<StripeCredentials | null> {
  if (cachedCreds) {
    return cachedCreds;
  }

  const row = await loadSettingsRow();
  const fromDb = row ? credentialsFromRow(row) : null;
  const envWebhook = serverEnv().STRIPE_WEBHOOK_SECRET?.trim();
  // A new live endpoint can rotate via env without re-entering the secret key in /admin/system.
  if (fromDb && envWebhook && isStripeWebhookSecret(envWebhook)) {
    cachedCreds = { ...fromDb, webhookSecret: envWebhook };
    return cachedCreds;
  }
  const resolved = fromDb ?? credentialsFromEnv();
  if (resolved) {
    cachedCreds = resolved;
  }
  return resolved;
}

export async function getStripeStatus(): Promise<StripeStatus> {
  const row = await loadSettingsRow();
  if (row?.stripeSecretEnc && row.stripeWebhookSecretEnc) {
    return {
      configured: true,
      source: "database",
      livemode: row.stripeLivemode,
      publishableLast4: publishableLast4(row.stripePublishableKey),
    };
  }

  const fromEnv = credentialsFromEnv();
  if (fromEnv) {
    return {
      configured: true,
      source: "env",
      livemode: fromEnv.livemode,
      publishableLast4: null,
    };
  }

  return { configured: false, source: null, livemode: null, publishableLast4: null };
}

export async function stripeEnabled(): Promise<boolean> {
  return (await getStripeCredentials()) !== null;
}

export async function getStripe(): Promise<Stripe> {
  const creds = await getStripeCredentials();
  if (!creds) {
    throw new Error("Stripe is not configured");
  }
  if (cachedClient && cachedSecret === creds.secretKey) {
    return cachedClient;
  }
  cachedClient = new Stripe(creds.secretKey, { typescript: true });
  cachedSecret = creds.secretKey;
  return cachedClient;
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

export function isStripeSecretKey(value: string): boolean {
  return /^(sk|rk)_(test|live)_/.test(value);
}

export function isStripeWebhookSecret(value: string): boolean {
  return value.startsWith("whsec_");
}

export function isStripePublishableKey(value: string): boolean {
  return /^pk_(test|live)_/.test(value);
}

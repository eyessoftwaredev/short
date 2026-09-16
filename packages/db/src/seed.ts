import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { PLANS, PLAN_KEYS } from "@short/core";
import { eq } from "drizzle-orm";
import { getDb, getSql } from "./client";
import { ensurePlatformDomain } from "./platform-domain";
import {
  plans,
  platformSettings,
  subscriptions,
  user,
  PLATFORM_SETTINGS_ID,
} from "./schema";

// `dotenv/config` resolves .env against this package, but the documented setup keeps a
// single .env at the repo root. dotenv never overwrites an already-set variable, so an
// explicitly exported DATABASE_URL still wins over the file.
loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env") });

async function seedPlatformDomain(db: ReturnType<typeof getDb>): Promise<void> {
  const row = await ensurePlatformDomain(db, process.env.PLATFORM_SHORT_DOMAIN);
  if (!row) {
    console.warn("PLATFORM_SHORT_DOMAIN is not set — skipping platform domain seed");
    return;
  }
  console.log(`Platform domain ready: ${row.hostname}`);
}

async function seedPlatformSettings(db: ReturnType<typeof getDb>): Promise<void> {
  await db
    .insert(platformSettings)
    .values({
      id: PLATFORM_SETTINGS_ID,
      name: process.env.PLATFORM_BRAND_NAME ?? "Short",
      tagline: process.env.PLATFORM_TAGLINE ?? "Short links, QR codes and bio pages",
      defaultLocale: process.env.PLATFORM_DEFAULT_LOCALE === "tr" ? "tr" : "en",
      localeSwitcherEnabled: process.env.PLATFORM_LOCALE_SWITCHER !== "0",
    })
    .onConflictDoNothing();

  console.log("Platform settings ready");
}

/**
 * Seeds the plan catalogue from the definitions in `@short/core`. Safe to re-run:
 * limits and features are refreshed while admin-managed Stripe price ids are kept.
 */
async function main(): Promise<void> {
  const db = getDb();

  for (const [index, key] of PLAN_KEYS.entries()) {
    const plan = PLANS[key];
    await db
      .insert(plans)
      .values({
        key: plan.key,
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        currency: plan.currency,
        limits: plan.limits,
        features: plan.features,
        visible: plan.key !== "enterprise" && plan.key !== "infinity",
        sortOrder: index,
      })
      .onConflictDoUpdate({
        target: plans.key,
        set: {
          name: plan.name,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          currency: plan.currency,
          limits: plan.limits,
          features: plan.features,
          sortOrder: index,
          updatedAt: new Date(),
        },
      });
  }

  console.log(`Seeded ${PLAN_KEYS.length} plans`);

  await attachLiveStripePrices(db);
  await grantInfinityToSuperadmins(db);
  await seedPlatformDomain(db);
  await seedPlatformSettings(db);
}

/**
 * Live Short.ky catalogue in USD. Adaptive Pricing localizes Checkout only when
 * USD is a settlement currency on the Stripe account. Opt-in so kisa.ly seed
 * does not inherit these ids. Existing admin-set ids are replaced only when
 * STRIPE_ATTACH_LIVE_PRICES=1.
 */
const LIVE_STRIPE_PRICES = {
  pro: {
    month: "price_1UGLvrPZFgnTJkfpdQvxuwGN",
    year: "price_1UGLvrPZFgnTJkfpmTuxhpMk",
  },
  business: {
    month: "price_1UGLvsPZFgnTJkfpVFgshZzH",
    year: "price_1UGLvtPZFgnTJkfp9YfrgCzt",
  },
} as const;

async function attachLiveStripePrices(db: ReturnType<typeof getDb>): Promise<void> {
  if (process.env.STRIPE_ATTACH_LIVE_PRICES !== "1") {
    return;
  }

  for (const [key, ids] of Object.entries(LIVE_STRIPE_PRICES)) {
    await db
      .update(plans)
      .set({
        stripePriceMonthlyId: ids.month,
        stripePriceYearlyId: ids.year,
        updatedAt: new Date(),
      })
      .where(eq(plans.key, key as (typeof PLAN_KEYS)[number]));
  }

  console.log("Attached live Stripe price ids for Pro and Business");
}

async function grantInfinityToSuperadmins(db: ReturnType<typeof getDb>): Promise<void> {
  const [infinity] = await db
    .select({ key: plans.key })
    .from(plans)
    .where(eq(plans.key, "infinity"))
    .limit(1);
  if (!infinity) {
    return;
  }

  const admins = await db.select({ id: user.id }).from(user).where(eq(user.role, "superadmin"));
  if (admins.length === 0) {
    return;
  }

  for (const admin of admins) {
    await db
      .insert(subscriptions)
      .values({ userId: admin.id, planKey: "infinity", status: "active" })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: { planKey: "infinity", status: "active", updatedAt: new Date() },
      });
  }

  console.log(`Granted Infinity to ${admins.length} staff account(s)`);
}

try {
  await main();
} catch (error) {
  console.error("Seed failed:", error);
  process.exitCode = 1;
} finally {
  await getSql().end({ timeout: 5 });
}

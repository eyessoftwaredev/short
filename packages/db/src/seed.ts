import "dotenv/config";
import { PLANS, PLAN_KEYS } from "@short/core";
import { getDb, getSql } from "./client";
import { plans } from "./schema";

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
        visible: plan.key !== "enterprise",
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
}

try {
  await main();
} catch (error) {
  console.error("Seed failed:", error);
  process.exitCode = 1;
} finally {
  await getSql().end({ timeout: 5 });
}

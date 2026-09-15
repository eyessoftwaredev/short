import type { PlanFeatures, PlanKey, PlanLimits } from "@short/core";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";

/**
 * Plans are seeded from `@short/core` PLANS but stored in Postgres so an admin can
 * adjust limits or attach Stripe price ids without a redeploy.
 */
export const plans = pgTable(
  "plans",
  {
    key: text("key").$type<PlanKey>().primaryKey(),
    name: text("name").notNull(),
    priceMonthly: integer("price_monthly").notNull().default(0),
    priceYearly: integer("price_yearly").notNull().default(0),
    currency: text("currency").notNull().default("USD"),
    limits: jsonb("limits").$type<PlanLimits>().notNull(),
    features: jsonb("features").$type<PlanFeatures>().notNull(),
    stripePriceMonthlyId: text("stripe_price_monthly_id"),
    stripePriceYearlyId: text("stripe_price_yearly_id"),
    visible: boolean("visible").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("plans_sort_idx").on(table.sortOrder)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    planKey: text("plan_key")
      .$type<PlanKey>()
      .notNull()
      .default("free")
      .references(() => plans.key),
    /** Mirrors Stripe: trialing | active | past_due | canceled | incomplete. */
    status: text("status").notNull().default("active"),
    interval: text("interval").notNull().default("month"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("subscriptions_workspace_uq").on(table.workspaceId),
    index("subscriptions_stripe_customer_idx").on(table.stripeCustomerId),
  ],
);

/**
 * One row per workspace per billing month. Click counts are written by a periodic
 * roll-forward from ClickHouse; resource counts are incremented inline.
 */
export const usageCounters = pgTable(
  "usage_counters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** YYYY-MM in UTC. */
    period: text("period").notNull(),
    linksCreated: integer("links_created").notNull().default(0),
    clicksTracked: bigint("clicks_tracked", { mode: "number" }).notNull().default(0),
    apiRequests: bigint("api_requests", { mode: "number" }).notNull().default(0),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("usage_counters_workspace_period_uq").on(table.workspaceId, table.period)],
);

export type PlanRow = typeof plans.$inferSelect;
export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type UsageCounterRow = typeof usageCounters.$inferSelect;

import { boolean, customType, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import {
  PLATFORM_SETTINGS_ID,
  type PlatformAssetKind,
  type PlatformLocale,
} from "../constants";

export {
  PLATFORM_ASSET_KINDS,
  PLATFORM_LOCALES,
  PLATFORM_SETTINGS_ID,
  type PlatformAssetKind,
  type PlatformLocale,
} from "../constants";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

/**
 * One row per deployment. Brand name, logos and locale policy live here so a
 * second Coolify app (kisa.ly) can share the repo without a multi-brand table.
 */
export const platformSettings = pgTable("platform_settings", {
  id: text("id").primaryKey().default(PLATFORM_SETTINGS_ID),
  name: text("name").notNull().default("Short"),
  tagline: text("tagline"),
  defaultLocale: text("default_locale").$type<PlatformLocale>().notNull().default("en"),
  localeSwitcherEnabled: boolean("locale_switcher_enabled").notNull().default(true),
  stripeSecretEnc: text("stripe_secret_enc"),
  stripeWebhookSecretEnc: text("stripe_webhook_secret_enc"),
  stripePublishableKey: text("stripe_publishable_key"),
  stripeLivemode: boolean("stripe_livemode"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const platformAssets = pgTable("platform_assets", {
  kind: text("kind").$type<PlatformAssetKind>().primaryKey(),
  contentType: text("content_type").notNull(),
  bytes: bytea("bytes").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PlatformSettingsRow = typeof platformSettings.$inferSelect;
export type PlatformAssetRow = typeof platformAssets.$inferSelect;

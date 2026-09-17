import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { organization } from "./auth";

export const PIXEL_PROVIDERS = ["meta", "google", "tiktok"] as const;
export type PixelProvider = (typeof PIXEL_PROVIDERS)[number];

/** Per-workspace Cloudflare token used to write the customer's own DNS records. */
export const cloudflareConnections = pgTable(
  "cloudflare_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    accountName: text("account_name").notNull(),
    encryptedToken: text("encrypted_token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("cloudflare_connections_workspace_uq").on(table.workspaceId)],
);

export const workspacePixels = pgTable(
  "workspace_pixels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    provider: text("provider").$type<PixelProvider>().notNull(),
    pixelId: text("pixel_id").notNull(),
    accessTokenEnc: text("access_token_enc"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("workspace_pixels_workspace_provider_uq").on(table.workspaceId, table.provider)],
);

export type CloudflareConnectionRow = typeof cloudflareConnections.$inferSelect;
export type WorkspacePixelRow = typeof workspacePixels.$inferSelect;

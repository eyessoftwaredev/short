import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { organization } from "./auth";

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

export type CloudflareConnectionRow = typeof cloudflareConnections.$inferSelect;

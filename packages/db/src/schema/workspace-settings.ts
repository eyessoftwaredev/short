import type { LinkOpenMode } from "@short/core";
import { boolean, date, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { folders } from "./links";
import { utmTemplates } from "./utm-templates";

/**
 * Per-workspace link defaults and notification switches. A workspace without a row
 * uses the column defaults, so the row is only written once someone changes something
 * (or the digest cron records a send).
 */
export const workspaceSettings = pgTable(
  "workspace_settings",
  {
    workspaceId: text("workspace_id")
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    defaultOpenMode: text("default_open_mode").$type<LinkOpenMode>().notNull().default("auto"),
    defaultUtmTemplateId: uuid("default_utm_template_id").references(() => utmTemplates.id, {
      onDelete: "set null",
    }),
    defaultNoIndex: boolean("default_no_index").notNull().default(true),
    defaultForwardQuery: boolean("default_forward_query").notNull().default(false),
    defaultFolderId: uuid("default_folder_id").references(() => folders.id, { onDelete: "set null" }),
    /** Email owners/admins when the health monitor marks links broken. */
    healthAlerts: boolean("health_alerts").notNull().default(true),
    weeklyDigest: boolean("weekly_digest").notNull().default(true),
    /** Monday (UTC) of the last week a digest went out; makes the cron idempotent. */
    digestSentFor: date("digest_sent_for", { mode: "string" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Covering indexes for the ON DELETE SET NULL foreign keys.
    index("workspace_settings_utm_template_idx").on(table.defaultUtmTemplateId),
    index("workspace_settings_folder_idx").on(table.defaultFolderId),
  ],
);

export type WorkspaceSettingsRow = typeof workspaceSettings.$inferSelect;

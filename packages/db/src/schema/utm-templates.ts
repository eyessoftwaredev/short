import { sql } from "drizzle-orm";
import type { UtmParams } from "@short/core";
import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { organization, user } from "./auth";

/** Saved UTM parameter sets the link editor can apply in one click. */
export const utmTemplates = pgTable(
  "utm_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Same shape as `utmSchema` in @short/core. */
    utm: jsonb("utm").$type<UtmParams>().notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Names are unique per workspace regardless of case ("Newsletter" vs "newsletter").
    uniqueIndex("utm_templates_workspace_name_uq").on(table.workspaceId, sql`lower(${table.name})`),
    index("utm_templates_created_by_idx").on(table.createdBy),
  ],
);

export type UtmTemplateRow = typeof utmTemplates.$inferSelect;

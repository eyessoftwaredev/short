import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { organization, user } from "./auth";
import { links } from "./links";

/** Public, read-only stats pages for one link, reachable at `/share/<token>`. */
export const statsShares = pgTable(
  "stats_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    linkId: uuid("link_id")
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    /** 43-character base64url secret; the only thing a visitor needs. */
    token: text("token").notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    showReferrers: boolean("show_referrers").notNull().default(false),
    showLocations: boolean("show_locations").notNull().default(false),
  },
  (table) => [
    uniqueIndex("stats_shares_token_uq").on(table.token),
    index("stats_shares_link_idx").on(table.linkId),
    index("stats_shares_workspace_idx").on(table.workspaceId),
    index("stats_shares_created_by_idx").on(table.createdBy),
  ],
);

export type StatsShareRow = typeof statsShares.$inferSelect;

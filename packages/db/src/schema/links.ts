import type { AbVariant, DomainStatus, QrStyle, TargetRule, UtmParams } from "@short/core";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth";

export type DomainValidationRecord = {
  type: "TXT" | "HTTP";
  name: string;
  value: string;
};

export const domains = pgTable(
  "domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    hostname: text("hostname").notNull(),
    /** Cloudflare for SaaS custom hostname id, null for platform-owned domains. */
    cfHostnameId: text("cf_hostname_id"),
    status: text("status").$type<DomainStatus>().notNull().default("pending"),
    sslStatus: text("ssl_status").notNull().default("pending"),
    /** Set when the domain belongs to the platform rather than a customer. */
    isPlatform: boolean("is_platform").notNull().default(false),
    isDefault: boolean("is_default").notNull().default(false),
    rootDestination: text("root_destination"),
    notFoundDestination: text("not_found_destination"),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    /** SSL TXT/HTTP records from Cloudflare for SaaS — kept so the panel survives a reload. */
    validationRecords: jsonb("validation_records")
      .$type<DomainValidationRecord[]>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("domains_hostname_uq").on(table.hostname),
    index("domains_workspace_idx").on(table.workspaceId),
  ],
);

export const folders = pgTable(
  "folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("folders_workspace_name_uq").on(table.workspaceId, table.name)],
);

export const links = pgTable(
  "links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    domainId: uuid("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id").references(() => folders.id, { onDelete: "set null" }),
    creatorId: text("creator_id").references(() => user.id, { onDelete: "set null" }),

    slug: text("slug").notNull(),
    destination: text("destination").notNull(),

    title: text("title"),
    description: text("description"),
    image: text("image"),
    comments: text("comments"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),

    rules: jsonb("rules").$type<TargetRule[]>().notNull().default([]),
    abVariants: jsonb("ab_variants").$type<AbVariant[]>().notNull().default([]),
    utm: jsonb("utm").$type<UtmParams | null>(),

    expiresAt: timestamp("expires_at", { withTimezone: true }),
    expiredDestination: text("expired_destination"),
    /** SHA-256 hex. The plaintext password is never stored. */
    passwordHash: text("password_hash"),
    iosDestination: text("ios_destination"),
    androidDestination: text("android_destination"),

    cloaked: boolean("cloaked").notNull().default(false),
    noIndex: boolean("no_index").notNull().default(true),
    forwardQuery: boolean("forward_query").notNull().default(false),
    archived: boolean("archived").notNull().default(false),

    /** Set by admins when a link is reported or flagged by scanning. */
    abuseFlaggedAt: timestamp("abuse_flagged_at", { withTimezone: true }),
    abuseReason: text("abuse_reason"),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("links_domain_slug_uq").on(table.domainId, table.slug),
    index("links_workspace_created_idx").on(table.workspaceId, table.createdAt),
    index("links_folder_idx").on(table.folderId),
  ],
);

export const qrCodes = pgTable(
  "qr_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    linkId: uuid("link_id")
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    style: jsonb("style").$type<QrStyle>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("qr_codes_workspace_idx").on(table.workspaceId),
    index("qr_codes_link_idx").on(table.linkId),
  ],
);

export type DomainRow = typeof domains.$inferSelect;
export type LinkRow = typeof links.$inferSelect;
export type NewLinkRow = typeof links.$inferInsert;
export type FolderRow = typeof folders.$inferSelect;
export type QrCodeRow = typeof qrCodes.$inferSelect;

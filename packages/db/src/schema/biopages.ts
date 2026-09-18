import type {
  BioBlock,
  BiopageBgType,
  BiopageFont,
  BiopageProfileMode,
  BiopageTemplateId,
  BiopageTheme,
} from "@short/core";
import {
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
import { domains } from "./links";

export const biopages = pgTable(
  "biopages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** Null means the page is served from the platform's default bio domain. */
    domainId: uuid("domain_id").references(() => domains.id, { onDelete: "set null" }),
    handle: text("handle").notNull(),

    displayName: text("display_name").notNull(),
    bio: text("bio").notNull().default(""),
    avatarUrl: text("avatar_url"),

    theme: text("theme").$type<BiopageTheme>().notNull().default("minimal"),
    buttonStyle: text("button_style").notNull().default("solid"),
    templateId: text("template_id").$type<BiopageTemplateId | null>(),
    bgType: text("bg_type").$type<BiopageBgType>().notNull().default("theme"),
    bgColor: text("bg_color"),
    bgGradient: text("bg_gradient"),
    bgImageUrl: text("bg_image_url"),
    buttonColor: text("button_color"),
    buttonTextColor: text("button_text_color"),
    textColor: text("text_color"),
    fontFamily: text("font_family").$type<BiopageFont>().notNull().default("sans"),
    profileMode: text("profile_mode").$type<BiopageProfileMode>().notNull().default("photo"),
    logoUrl: text("logo_url"),
    profileText: text("profile_text").notNull().default(""),
    coverUrl: text("cover_url"),
    ogImageUrl: text("og_image_url"),
    adsEnabled: boolean("ads_enabled").notNull().default(false),
    adMobileImage: text("ad_mobile_image"),
    adMobileHref: text("ad_mobile_href"),
    adLeftImage: text("ad_left_image"),
    adLeftHref: text("ad_left_href"),
    adRightImage: text("ad_right_image"),
    adRightHref: text("ad_right_href"),
    customCss: text("custom_css").notNull().default(""),
    sensitive: boolean("sensitive").notNull().default(false),
    passwordHash: text("password_hash"),
    publishAt: timestamp("publish_at", { withTimezone: true }),
    unpublishAt: timestamp("unpublish_at", { withTimezone: true }),

    seoTitle: text("seo_title").notNull().default(""),
    seoDescription: text("seo_description").notNull().default(""),

    published: boolean("published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("biopages_domain_handle_uq").on(table.domainId, table.handle),
    index("biopages_workspace_idx").on(table.workspaceId),
  ],
);

/**
 * Blocks live in their own table so reordering is a cheap positional update and
 * per-block click stats can reference a stable id.
 */
export const bioBlocks = pgTable(
  "bio_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    biopageId: uuid("biopage_id")
      .notNull()
      .references(() => biopages.id, { onDelete: "cascade" }),
    type: text("type").$type<BioBlock["type"]>().notNull(),
    position: integer("position").notNull().default(0),
    visible: boolean("visible").notNull().default(true),
    config: jsonb("config").$type<BioBlock>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("bio_blocks_page_position_idx").on(table.biopageId, table.position)],
);

export const bioLeads = pgTable(
  "bio_leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    biopageId: uuid("biopage_id")
      .notNull()
      .references(() => biopages.id, { onDelete: "cascade" }),
    blockId: uuid("block_id").notNull(),
    email: text("email").notNull(),
    payload: jsonb("payload").$type<Record<string, string>>().notNull().default({}),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("bio_leads_page_created_idx").on(table.biopageId, table.createdAt),
  ],
);

export type BiopageRow = typeof biopages.$inferSelect;
export type BioBlockRow = typeof bioBlocks.$inferSelect;
export type BioLeadRow = typeof bioLeads.$inferSelect;

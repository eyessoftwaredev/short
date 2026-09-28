-- Hand-written in the style of 0010/0011 (drizzle-kit produced the equivalent plain
-- statements plus meta/0012_snapshot.json). Every statement is idempotent and additive:
-- the previous panel release keeps working against this schema during a rolling deploy
-- (new columns are nullable or carry a constant default, new tables are unused by it).
--
-- On Postgres 11+ the ADD COLUMNs below are catalogue-only changes. The three partial
-- indexes on "links" do scan the table while holding a SHARE lock (writes wait); on a
-- large "links" table pre-create them by hand with CREATE INDEX CONCURRENTLY first and
-- the IF NOT EXISTS below then no-ops.

-- Click limit: lifetime cap (NULL = unlimited) and the moment the cap was reached. The
-- click-limit cron sets click_limit_reached_at; the edge then treats the link as expired.
ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "max_clicks" integer;
--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "click_limit_reached_at" timestamp with time zone;
--> statement-breakpoint

-- Destination health monitor ('unknown' | 'ok' | 'broken'); two consecutive failed
-- probes (health_failures) flip a link to 'broken'.
ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "health_status" text DEFAULT 'unknown' NOT NULL;
--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "health_checked_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "health_status_code" integer;
--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "health_failures" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "broken_since" timestamp with time zone;
--> statement-breakpoint

-- Saved UTM parameter sets, names unique per workspace regardless of case.
CREATE TABLE IF NOT EXISTS "utm_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"utm" jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Per-workspace link defaults and notification switches. No row = column defaults.
CREATE TABLE IF NOT EXISTS "workspace_settings" (
	"workspace_id" text PRIMARY KEY NOT NULL,
	"default_open_mode" text DEFAULT 'auto' NOT NULL,
	"default_utm_template_id" uuid,
	"default_no_index" boolean DEFAULT true NOT NULL,
	"default_forward_query" boolean DEFAULT false NOT NULL,
	"default_folder_id" uuid,
	"health_alerts" boolean DEFAULT true NOT NULL,
	"weekly_digest" boolean DEFAULT true NOT NULL,
	"digest_sent_for" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Public read-only stats pages for one link (/share/<token>).
CREATE TABLE IF NOT EXISTS "stats_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"link_id" uuid NOT NULL,
	"token" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"show_referrers" boolean DEFAULT false NOT NULL,
	"show_locations" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint

-- Foreign keys, named as in the Drizzle snapshot and added only when missing.
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'utm_templates_workspace_id_organization_id_fk') THEN
		ALTER TABLE "utm_templates" ADD CONSTRAINT "utm_templates_workspace_id_organization_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'utm_templates_created_by_user_id_fk') THEN
		ALTER TABLE "utm_templates" ADD CONSTRAINT "utm_templates_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_settings_workspace_id_organization_id_fk') THEN
		ALTER TABLE "workspace_settings" ADD CONSTRAINT "workspace_settings_workspace_id_organization_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_settings_default_utm_template_id_utm_templates_id_fk') THEN
		ALTER TABLE "workspace_settings" ADD CONSTRAINT "workspace_settings_default_utm_template_id_utm_templates_id_fk" FOREIGN KEY ("default_utm_template_id") REFERENCES "public"."utm_templates"("id") ON DELETE set null ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_settings_default_folder_id_folders_id_fk') THEN
		ALTER TABLE "workspace_settings" ADD CONSTRAINT "workspace_settings_default_folder_id_folders_id_fk" FOREIGN KEY ("default_folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stats_shares_workspace_id_organization_id_fk') THEN
		ALTER TABLE "stats_shares" ADD CONSTRAINT "stats_shares_workspace_id_organization_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stats_shares_link_id_links_id_fk') THEN
		ALTER TABLE "stats_shares" ADD CONSTRAINT "stats_shares_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stats_shares_created_by_user_id_fk') THEN
		ALTER TABLE "stats_shares" ADD CONSTRAINT "stats_shares_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint

-- Indexes on the new tables (empty at this point, so these are instant).
CREATE UNIQUE INDEX IF NOT EXISTS "utm_templates_workspace_name_uq" ON "utm_templates" USING btree ("workspace_id", lower("name"));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "utm_templates_created_by_idx" ON "utm_templates" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_settings_utm_template_idx" ON "workspace_settings" USING btree ("default_utm_template_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_settings_folder_idx" ON "workspace_settings" USING btree ("default_folder_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stats_shares_token_uq" ON "stats_shares" USING btree ("token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stats_shares_link_idx" ON "stats_shares" USING btree ("link_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stats_shares_workspace_idx" ON "stats_shares" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stats_shares_created_by_idx" ON "stats_shares" USING btree ("created_by");
--> statement-breakpoint

-- Partial indexes on "links" (see the CONCURRENTLY note at the top).
-- Broken-links list per workspace and the weekly digest's "new broken links" count.
CREATE INDEX IF NOT EXISTS "links_health_broken_idx" ON "links" USING btree ("workspace_id", "broken_since") WHERE "health_status" = 'broken';
--> statement-breakpoint
-- The health cron picks the links checked longest ago, never-checked first.
CREATE INDEX IF NOT EXISTS "links_health_checked_idx" ON "links" USING btree ("health_checked_at" NULLS FIRST) WHERE "archived" = false AND "disabled_at" IS NULL;
--> statement-breakpoint
-- The click-limit cron only scans links that carry a cap.
CREATE INDEX IF NOT EXISTS "links_max_clicks_idx" ON "links" USING btree ("max_clicks") WHERE "max_clicks" IS NOT NULL;

ALTER TABLE "biopages" ADD COLUMN "template_id" text;
ALTER TABLE "biopages" ADD COLUMN "bg_type" text DEFAULT 'theme' NOT NULL;
ALTER TABLE "biopages" ADD COLUMN "bg_color" text;
ALTER TABLE "biopages" ADD COLUMN "bg_gradient" text;
ALTER TABLE "biopages" ADD COLUMN "bg_image_url" text;
ALTER TABLE "biopages" ADD COLUMN "button_color" text;
ALTER TABLE "biopages" ADD COLUMN "button_text_color" text;
ALTER TABLE "biopages" ADD COLUMN "text_color" text;
ALTER TABLE "biopages" ADD COLUMN "font_family" text DEFAULT 'sans' NOT NULL;
ALTER TABLE "biopages" ADD COLUMN "profile_mode" text DEFAULT 'photo' NOT NULL;
ALTER TABLE "biopages" ADD COLUMN "logo_url" text;
ALTER TABLE "biopages" ADD COLUMN "profile_text" text DEFAULT '' NOT NULL;
ALTER TABLE "biopages" ADD COLUMN "cover_url" text;
ALTER TABLE "biopages" ADD COLUMN "og_image_url" text;
ALTER TABLE "biopages" ADD COLUMN "ads_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "biopages" ADD COLUMN "ad_mobile_image" text;
ALTER TABLE "biopages" ADD COLUMN "ad_mobile_href" text;
ALTER TABLE "biopages" ADD COLUMN "ad_left_image" text;
ALTER TABLE "biopages" ADD COLUMN "ad_left_href" text;
ALTER TABLE "biopages" ADD COLUMN "ad_right_image" text;
ALTER TABLE "biopages" ADD COLUMN "ad_right_href" text;
ALTER TABLE "biopages" ADD COLUMN "custom_css" text DEFAULT '' NOT NULL;
ALTER TABLE "biopages" ADD COLUMN "sensitive" boolean DEFAULT false NOT NULL;
ALTER TABLE "biopages" ADD COLUMN "password_hash" text;
ALTER TABLE "biopages" ADD COLUMN "publish_at" timestamp with time zone;
ALTER TABLE "biopages" ADD COLUMN "unpublish_at" timestamp with time zone;

CREATE TABLE IF NOT EXISTS "bio_leads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "biopage_id" uuid NOT NULL REFERENCES "biopages"("id") ON DELETE cascade,
  "block_id" uuid NOT NULL,
  "email" text NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "ip_hash" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "bio_leads_page_created_idx" ON "bio_leads" ("biopage_id", "created_at");

CREATE TABLE "workspace_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"kind" text DEFAULT 'image' NOT NULL,
	"content_type" text NOT NULL,
	"bytes" bytea NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "workspace_media_workspace_idx" ON "workspace_media" USING btree ("workspace_id");
--> statement-breakpoint
ALTER TABLE "workspace_media" ADD CONSTRAINT "workspace_media_workspace_id_organization_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "qr_codes" ALTER COLUMN "link_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "qr_codes" ADD COLUMN "payload_kind" text DEFAULT 'link' NOT NULL;
--> statement-breakpoint
ALTER TABLE "qr_codes" ADD COLUMN "payload" text;
--> statement-breakpoint
CREATE TABLE "workspace_pixels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"provider" text NOT NULL,
	"pixel_id" text NOT NULL,
	"access_token_enc" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_pixels_workspace_provider_uq" ON "workspace_pixels" USING btree ("workspace_id","provider");
--> statement-breakpoint
ALTER TABLE "workspace_pixels" ADD CONSTRAINT "workspace_pixels_workspace_id_organization_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "theme" text;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;

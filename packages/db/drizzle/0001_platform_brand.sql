CREATE TABLE "platform_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"name" text DEFAULT 'Short' NOT NULL,
	"tagline" text,
	"default_locale" text DEFAULT 'en' NOT NULL,
	"locale_switcher_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_assets" (
	"kind" text PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"bytes" bytea NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "platform_settings" ("id", "name", "tagline", "default_locale", "locale_switcher_enabled")
VALUES ('default', 'Short', 'Short links, QR codes and bio pages', 'en', true)
ON CONFLICT ("id") DO NOTHING;

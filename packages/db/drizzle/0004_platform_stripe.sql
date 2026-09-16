ALTER TABLE "platform_settings" ADD COLUMN "stripe_secret_enc" text;
--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "stripe_webhook_secret_enc" text;
--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "stripe_publishable_key" text;
--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "stripe_livemode" boolean;

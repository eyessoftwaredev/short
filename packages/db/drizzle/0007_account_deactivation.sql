ALTER TABLE "user" ADD COLUMN "deletion_scheduled_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "deactivated_at" timestamp with time zone;

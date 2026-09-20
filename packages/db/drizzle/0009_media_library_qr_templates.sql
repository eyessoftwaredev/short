ALTER TABLE "workspace_media" ADD COLUMN "filename" text;
--> statement-breakpoint
ALTER TABLE "workspace_media" ADD COLUMN "byte_size" integer;
--> statement-breakpoint
ALTER TABLE "workspace_media" ADD COLUMN "uploaded_by" text;
--> statement-breakpoint
ALTER TABLE "workspace_media" ADD CONSTRAINT "workspace_media_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "qr_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"style" jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "qr_templates_workspace_idx" ON "qr_templates" USING btree ("workspace_id");
--> statement-breakpoint
ALTER TABLE "qr_templates" ADD CONSTRAINT "qr_templates_workspace_id_organization_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "qr_templates" ADD CONSTRAINT "qr_templates_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;

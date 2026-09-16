ALTER TABLE "organization" ADD COLUMN "kind" text DEFAULT 'personal' NOT NULL;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "user_id" text;
--> statement-breakpoint
WITH ranked AS (
	SELECT s.id,
		ROW_NUMBER() OVER (
			PARTITION BY m.user_id
			ORDER BY
				CASE s.plan_key
					WHEN 'infinity' THEN 0
					WHEN 'enterprise' THEN 1
					WHEN 'business' THEN 2
					WHEN 'pro' THEN 3
					ELSE 4
				END,
				s.updated_at DESC NULLS LAST
		) AS rn
	FROM "subscriptions" s
	INNER JOIN "member" m ON m.organization_id = s.workspace_id AND m.role = 'owner'
)
DELETE FROM "subscriptions" WHERE "id" IN (SELECT id FROM ranked WHERE rn > 1);
--> statement-breakpoint
UPDATE "subscriptions" AS s
SET "user_id" = m.user_id
FROM "member" AS m
WHERE m.organization_id = s.workspace_id AND m.role = 'owner' AND s.user_id IS NULL;
--> statement-breakpoint
DELETE FROM "subscriptions" WHERE "user_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "user_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
DROP INDEX "subscriptions_workspace_uq";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_workspace_id_organization_id_fk";
--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "workspace_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspace_id_organization_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
UPDATE "subscriptions" SET "workspace_id" = NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_user_uq" ON "subscriptions" USING btree ("user_id");
--> statement-breakpoint
UPDATE "plans"
SET "limits" = jsonb_set(
	"limits",
	'{teams}',
	CASE "key"
		WHEN 'free' THEN '0'::jsonb
		WHEN 'pro' THEN '1'::jsonb
		WHEN 'business' THEN '3'::jsonb
		ELSE '-1'::jsonb
	END
),
"updated_at" = now();

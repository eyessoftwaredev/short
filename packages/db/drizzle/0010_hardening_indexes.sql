-- Hand-written (drizzle-kit only produced meta/0010_snapshot.json): its diff against
-- 0000_snapshot re-created every table from 0001-0009. Every statement is idempotent.
--
-- Plain CREATE INDEX takes a SHARE lock (writes wait, reads do not) for the build. On a
-- large `links` / `audit_logs` table, pre-create these by hand with CONCURRENTLY first;
-- the IF NOT EXISTS below then no-ops.

-- Foreign keys without a covering index: user deletion (cascade / set null) and the
-- lookups Better Auth and the panel run on them would otherwise scan the whole table.
CREATE INDEX IF NOT EXISTS "two_factor_user_idx" ON "two_factor" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invitation_inviter_idx" ON "invitation" USING btree ("inviter_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invitation_email_lower_idx" ON "invitation" USING btree (lower("email"));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "links_creator_idx" ON "links" USING btree ("creator_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_impersonator_idx" ON "audit_logs" USING btree ("impersonator_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_workspace_idx" ON "subscriptions" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_media_uploaded_by_idx" ON "workspace_media" USING btree ("uploaded_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qr_templates_created_by_idx" ON "qr_templates" USING btree ("created_by");
--> statement-breakpoint

-- Admin views that order / filter across every workspace.
CREATE INDEX IF NOT EXISTS "links_created_idx" ON "links" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "links_abuse_flagged_idx" ON "links" USING btree ("abuse_flagged_at") WHERE "abuse_flagged_at" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");
--> statement-breakpoint

-- Public biopage render and handle availability look pages up by handle alone.
CREATE INDEX IF NOT EXISTS "biopages_handle_idx" ON "biopages" USING btree ("handle");
--> statement-breakpoint

-- biopages_domain_handle_uq treats NULL domain_id as distinct, so two platform-hosted
-- pages could hold the same handle. Skipped with a WARNING when production already has
-- duplicates, so the deploy is not blocked; dedupe, then run the CREATE by hand.
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "biopages" WHERE "domain_id" IS NULL GROUP BY "handle" HAVING count(*) > 1
	) THEN
		RAISE WARNING 'biopages_platform_handle_uq not created: duplicate platform handles exist';
	ELSE
		CREATE UNIQUE INDEX IF NOT EXISTS "biopages_platform_handle_uq" ON "biopages" USING btree ("handle") WHERE "domain_id" IS NULL;
	END IF;
END $$;
--> statement-breakpoint

-- 0008 declared the bio_leads FK inline, so Postgres named it *_fkey. Align it with the
-- name in the Drizzle snapshot so a later generated migration can find it.
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'bio_leads_biopage_id_fkey' AND conrelid = 'public.bio_leads'::regclass
	) AND NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'bio_leads_biopage_id_biopages_id_fk' AND conrelid = 'public.bio_leads'::regclass
	) THEN
		ALTER TABLE "bio_leads" RENAME CONSTRAINT "bio_leads_biopage_id_fkey" TO "bio_leads_biopage_id_biopages_id_fk";
	END IF;
END $$;

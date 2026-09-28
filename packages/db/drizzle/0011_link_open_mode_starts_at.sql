-- Hand-written in the style of 0010 (drizzle-kit produced the same two ALTERs plus
-- meta/0011_snapshot.json); IF NOT EXISTS keeps every statement idempotent.
--
-- On Postgres 11+ adding a nullable column, or one with a constant default, is a
-- catalogue-only change: no table rewrite, and the ACCESS EXCLUSIVE lock on "links" is
-- held only for an instant.

-- Scheduled go-live. NULL (every existing link) means live immediately; before this
-- moment the edge worker answers with the domain's not-found handling.
ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "starts_at" timestamp with time zone;
--> statement-breakpoint

-- Per-link handoff mode read by the edge worker: 'auto' (plain redirect, the behaviour
-- of every existing link), 'app' (open known destinations in their native app on
-- iOS/Android) or 'browser' (leave social in-app browsers).
ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "open_mode" text DEFAULT 'auto' NOT NULL;

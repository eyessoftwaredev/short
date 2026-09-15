import type { TrackedEvent } from "@short/core";

export type EdgeEnv = {
  /** Link, domain and biopage records written by the panel. */
  LINKS: KVNamespace;
  /** Producer binding; the consumer lives in apps/ingest. */
  CLICK_QUEUE: Queue<TrackedEvent>;

  /** Base URL of the Next.js app, used for KV-miss resolution and biopage rendering. */
  ORIGIN_URL: string;
  /** Where visitors land when a hostname or slug is unknown. */
  DEFAULT_NOT_FOUND: string;
  /** Seconds a resolved link stays in KV before the worker re-reads the origin. */
  KV_TTL_SECONDS?: string;

  /** Shared secret for POST /api/internal/resolve. */
  INTERNAL_TOKEN: string;
  /** Rotating-salt input for visitor hashing; never leaves the worker. */
  VISITOR_SALT: string;
};

export function kvTtlSeconds(env: EdgeEnv): number {
  const parsed = Number.parseInt(env.KV_TTL_SECONDS ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 60 ? parsed : 3600;
}

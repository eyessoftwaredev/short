import {
  KV_SCHEMA_VERSION,
  biopageKey,
  domainKey,
  isCurrentKvRecord,
  linkKey,
  type BiopageKvRecord,
  type DomainKvRecord,
  type LinkKvRecord,
} from "@short/core";
import { kvTtlSeconds, type EdgeEnv } from "./env";

type OriginLookup = {
  link: LinkKvRecord | null;
  domain: DomainKvRecord | null;
  biopage: BiopageKvRecord | null;
};

async function readKv<T>(env: EdgeEnv, key: string): Promise<T | null> {
  try {
    const value = await env.LINKS.get(key, "json");
    return isCurrentKvRecord(value) ? (value as T) : null;
  } catch {
    // A KV read failure must fall through to the origin rather than 500 the redirect.
    return null;
  }
}

/**
 * Second-level cache in front of the origin, for everything KV does not hold: records
 * the panel never wrote under this exact host (aliases) and "does not exist" answers.
 * It used to live in KV too, but KV writes are the scarce resource (1,000 a day on the
 * free plan, account-wide): every scanner probe for `/wp-login.php` or `/.env` became a
 * write. The Cache API is free, local to the data centre and needs no cleanup. KV stays
 * the source the panel writes to, and it is always read first, so a link the panel just
 * created is seen immediately even if a "missing" answer is still cached here.
 */
const EDGE_CACHE_PREFIX = "/__short-edge-cache/";
/** Origin answers cached at the edge. Short, so alias records cannot go stale for long. */
const POSITIVE_CACHE_SECONDS = 300;

function edgeCache(): Cache | null {
  try {
    return typeof caches === "undefined" ? null : caches.default;
  } catch {
    return null;
  }
}

function edgeCacheRequest(hostname: string, key: string): Request {
  return new Request(`https://${hostname}${EDGE_CACHE_PREFIX}${encodeURIComponent(key)}`);
}

async function readEdgeCache<T>(hostname: string, key: string): Promise<T | null> {
  const cache = edgeCache();
  if (!cache) {
    return null;
  }
  try {
    const hit = await cache.match(edgeCacheRequest(hostname, key));
    if (!hit) {
      return null;
    }
    const value: unknown = await hit.json();
    return isCurrentKvRecord(value) ? (value as T) : null;
  } catch {
    return null;
  }
}

async function writeEdgeCache(hostname: string, key: string, value: unknown, seconds: number): Promise<void> {
  const cache = edgeCache();
  if (!cache) {
    return;
  }
  try {
    await cache.put(
      edgeCacheRequest(hostname, key),
      new Response(JSON.stringify(value), {
        headers: { "content-type": "application/json", "cache-control": `max-age=${seconds}` },
      }),
    );
  } catch {
    // Best effort: without it the next request simply asks the origin again.
  }
}

/** KV first (what the panel wrote), then the edge cache (origin answers, misses). */
async function readRecord<T>(env: EdgeEnv, hostname: string, key: string): Promise<T | null> {
  return (await readKv<T>(env, key)) ?? (await readEdgeCache<T>(hostname, key));
}

/**
 * Asks the panel to resolve a hostname/slug pair that is not in KV yet. The result is
 * kept in the edge cache so only the first visitor per data centre pays this cost.
 */
async function lookupOrigin(
  env: EdgeEnv,
  hostname: string,
  slug: string,
): Promise<OriginLookup | null> {
  try {
    const response = await fetch(`${env.ORIGIN_URL}/api/internal/resolve`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.INTERNAL_TOKEN}`,
      },
      body: JSON.stringify({ hostname, slug }),
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return null;
    }

    // The origin is trusted but not infallible, and whatever comes back is cached at
    // the edge. A record that does not match the key it would be stored under, or
    // that predates the current schema, is discarded rather than poisoning the cache.
    const body = (await response.json()) as Partial<OriginLookup>;
    const domain = isCurrentKvRecord(body.domain) ? (body.domain as DomainKvRecord) : null;
    const link = isCurrentKvRecord(body.link) ? (body.link as LinkKvRecord) : null;
    const biopage = isCurrentKvRecord(body.biopage) ? (body.biopage as BiopageKvRecord) : null;

    return {
      domain: domain?.hostname === hostname ? domain : null,
      link: link?.hostname === hostname && link.slug === slug ? link : null,
      biopage: biopage?.handle === slug.toLowerCase() ? biopage : null,
    };
  } catch {
    return null;
  }
}

/**
 * Written for a hostname/slug pair the origin says does not exist. Without it every
 * request for an unknown slug costs one Postgres round trip on the panel, which makes a
 * 404 a free amplification vector.
 */
type NegativeKvRecord = { v: typeof KV_SCHEMA_VERSION; miss: true };
const NEGATIVE_TTL_SECONDS = 60;

function isMiss(value: unknown): boolean {
  return typeof value === "object" && value !== null && (value as { miss?: unknown }).miss === true;
}

async function backfill(
  env: EdgeEnv,
  lookup: OriginLookup,
  hostname: string,
  slug: string,
  domainWasCached: boolean,
): Promise<void> {
  const ttl = Math.min(kvTtlSeconds(env), POSITIVE_CACHE_SECONDS);
  const writes: Promise<unknown>[] = [];
  const miss: NegativeKvRecord = { v: KV_SCHEMA_VERSION, miss: true };

  // An unknown hostname would otherwise cost a panel round trip on every request. The
  // panel's own KV write on domain creation takes precedence over this marker.
  if (!lookup.domain) {
    if (!domainWasCached) {
      writes.push(writeEdgeCache(hostname, domainKey(hostname), miss, NEGATIVE_TTL_SECONDS));
    }
    await Promise.allSettled(writes);
    return;
  }

  if (!domainWasCached) {
    writes.push(writeEdgeCache(hostname, domainKey(hostname), lookup.domain, ttl));
  }

  if (lookup.link) {
    writes.push(writeEdgeCache(hostname, linkKey(hostname, slug), lookup.link, ttl));
  } else if (lookup.biopage) {
    writes.push(writeEdgeCache(hostname, biopageKey(hostname, slug), lookup.biopage, ttl));
  } else if (slug !== "") {
    writes.push(writeEdgeCache(hostname, linkKey(hostname, slug), miss, NEGATIVE_TTL_SECONDS));
  }

  await Promise.allSettled(writes);
}

export type ResolvedTarget = {
  domain: DomainKvRecord | null;
  link: LinkKvRecord | null;
  biopage: BiopageKvRecord | null;
  /** True when the origin had to be consulted, so the caller can schedule a KV backfill. */
  fromOrigin: boolean;
  backfill: () => Promise<void>;
};

/** KV keys are capped at 512 bytes; a longer slug can only ever miss. */
const MAX_SLUG_LENGTH = 128;

export async function resolveTarget(
  env: EdgeEnv,
  hostname: string,
  slug: string,
): Promise<ResolvedTarget> {
  const empty = { domain: null, link: null, biopage: null, fromOrigin: false, backfill: async () => {} };

  if (slug.length > MAX_SLUG_LENGTH) {
    return empty;
  }

  const lookupSlug = slug === "" ? null : slug;
  const [cachedDomain, cached, biopage] = await Promise.all([
    readRecord<unknown>(env, hostname, domainKey(hostname)),
    lookupSlug === null
      ? Promise.resolve(null)
      : readRecord<unknown>(env, hostname, linkKey(hostname, lookupSlug)),
    lookupSlug === null
      ? Promise.resolve(null)
      : readRecord<BiopageKvRecord>(env, hostname, biopageKey(hostname, lookupSlug)),
  ]);

  // The origin already said this hostname is not a customer domain.
  if (isMiss(cachedDomain)) {
    return empty;
  }
  const domain = cachedDomain as DomainKvRecord | null;

  // The origin already said neither a link nor a bio exists here. Publishing a bio or
  // creating a link writes its own KV key, which the reads above see immediately, and
  // the marker only lives for a minute; asking the panel again on every hit would turn
  // a hot 404 (a stale QR code, a scanner) into one Postgres query per request.
  if (domain && isMiss(cached) && !biopage) {
    return { domain, link: null, biopage: null, fromOrigin: false, backfill: async () => {} };
  }

  const link = isMiss(cached) ? null : (cached as LinkKvRecord | null);

  if (domain && (link || biopage || slug === "")) {
    return { domain, link, biopage, fromOrigin: false, backfill: async () => {} };
  }

  const lookup = await lookupOrigin(env, hostname, slug);
  if (!lookup) {
    return { domain, link, biopage, fromOrigin: true, backfill: async () => {} };
  }

  const domainWasCached = domain !== null;

  return {
    domain: lookup.domain ?? domain,
    link: lookup.link ?? link,
    biopage: lookup.biopage ?? biopage,
    fromOrigin: true,
    backfill: () => backfill(env, lookup, hostname, slug, domainWasCached),
  };
}

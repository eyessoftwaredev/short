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
 * Asks the panel to resolve a hostname/slug pair that is not in KV yet. The result is
 * written back into KV so only the first visitor after a cold start pays this cost.
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

    // The origin is trusted but not infallible, and whatever comes back is cached in KV
    // for an hour. A record that does not match the key it would be stored under, or
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
  const ttl = kvTtlSeconds(env);
  const writes: Promise<unknown>[] = [];
  const miss: NegativeKvRecord = { v: KV_SCHEMA_VERSION, miss: true };

  // An unknown hostname would otherwise cost a panel round trip on every request. The
  // panel's own write on domain creation replaces this marker.
  if (!lookup.domain) {
    if (!domainWasCached) {
      writes.push(
        env.LINKS.put(domainKey(hostname), JSON.stringify(miss), { expirationTtl: NEGATIVE_TTL_SECONDS }),
      );
    }
    await Promise.allSettled(writes);
    return;
  }

  // KV allows one write per second per key; re-writing an already cached domain record
  // on every miss burns that budget and gets the hot key throttled.
  if (!domainWasCached) {
    writes.push(env.LINKS.put(domainKey(hostname), JSON.stringify(lookup.domain), { expirationTtl: ttl }));
  }

  if (lookup.link) {
    writes.push(env.LINKS.put(linkKey(hostname, slug), JSON.stringify(lookup.link), { expirationTtl: ttl }));
  } else if (lookup.biopage) {
    writes.push(
      env.LINKS.put(biopageKey(hostname, slug), JSON.stringify(lookup.biopage), { expirationTtl: ttl }),
    );
  } else if (slug !== "") {
    writes.push(
      env.LINKS.put(linkKey(hostname, slug), JSON.stringify(miss), {
        expirationTtl: NEGATIVE_TTL_SECONDS,
      }),
    );
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
    readKv<unknown>(env, domainKey(hostname)),
    lookupSlug === null ? Promise.resolve(null) : readKv<unknown>(env, linkKey(hostname, lookupSlug)),
    lookupSlug === null
      ? Promise.resolve(null)
      : readKv<BiopageKvRecord>(env, biopageKey(hostname, lookupSlug)),
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

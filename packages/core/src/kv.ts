import type { LinkOpenMode } from "./open-mode";
import type { AbVariant, TargetRule } from "./targeting";
import type { UtmParams } from "./url";

/**
 * Shapes written to Workers KV by the panel and read by the redirect worker.
 * `v` lets the worker skip records written by an older panel deploy.
 */
export const KV_SCHEMA_VERSION = 1 as const;

export type LinkKvRecord = {
  v: typeof KV_SCHEMA_VERSION;
  id: string;
  workspaceId: string;
  hostname: string;
  slug: string;
  destination: string;
  rules: TargetRule[];
  abVariants: AbVariant[];
  utm: UtmParams | null;
  expiresAt: number | null;
  expiredDestination: string | null;
  /**
   * Epoch ms of the scheduled go-live; before it the worker treats the link as missing.
   * Missing on records cached before the setting existed, which means live.
   */
  startsAt?: number | null;
  /** SHA-256 hex of the gate password; the worker never sees the plaintext. */
  passwordHash: string | null;
  iosDestination: string | null;
  androidDestination: string | null;
  /** Render the destination inside a frame instead of issuing a 30x. */
  cloaked: boolean;
  noIndex: boolean;
  forwardQuery: boolean;
  /** Archived and disabled links fall through to the domain's not-found handling. */
  disabled: boolean;
  title: string | null;
  description: string | null;
  image: string | null;
  /** When true the worker still redirects but skips analytics ingest. */
  overQuota?: boolean;
  /**
   * App / in-app-browser handoff. Optional because records cached before the setting
   * existed lack it; the worker reads it through `normalizeOpenMode`, so absent means
   * `auto` and no schema version bump is needed.
   */
  openMode?: LinkOpenMode;
  /**
   * Set once the link's lifetime click limit was reached (the panel's click-limit cron).
   * The worker then treats the link as expired. Optional for records cached before it.
   */
  limitReached?: boolean;
};

/**
 * `pending` awaits DNS, `provisioning` awaits the certificate, `error` needs the
 * customer to fix something, `suspended` is an admin action that stops all redirects.
 */
export type DomainStatus = "pending" | "provisioning" | "active" | "error" | "suspended";

export type DomainKvRecord = {
  v: typeof KV_SCHEMA_VERSION;
  id: string;
  workspaceId: string;
  hostname: string;
  status: DomainStatus;
  /** Where `/` goes. Falls back to the marketing site when null. */
  rootDestination: string | null;
  /** Where unknown slugs go. Falls back to a 404 page when null. */
  notFoundDestination: string | null;
};

export type BiopageKvRecord = {
  v: typeof KV_SCHEMA_VERSION;
  id: string;
  workspaceId: string;
  handle: string;
  published: boolean;
  /** Epoch ms. Missing/null means no lower bound. */
  publishAt?: number | null;
  /** Epoch ms. Missing/null means no upper bound. */
  unpublishAt?: number | null;
  passwordHash?: string | null;
};

/** True while a link is scheduled but not live yet. */
export function isBeforeLinkStart(link: Pick<LinkKvRecord, "startsAt">, now: number): boolean {
  return typeof link.startsAt === "number" && now < link.startsAt;
}

export function isLinkLimitReached(link: Pick<LinkKvRecord, "limitReached">): boolean {
  return link.limitReached === true;
}

/**
 * The expiry the worker enforces. A link that used up its click limit behaves exactly
 * like an expired one (expiry destination, else not-found), so it reports "already".
 */
export function effectiveExpiresAt(
  link: Pick<LinkKvRecord, "expiresAt" | "limitReached">,
): number | null {
  return isLinkLimitReached(link) ? 0 : link.expiresAt;
}

export function isLinkExpired(
  link: Pick<LinkKvRecord, "expiresAt" | "limitReached">,
  now: number,
): boolean {
  const expiresAt = effectiveExpiresAt(link);
  return expiresAt != null && now >= expiresAt;
}

export function linkKey(hostname: string, slug: string): string {
  return `l:${hostname.toLowerCase()}:${slug}`;
}

export function domainKey(hostname: string): string {
  return `d:${hostname.toLowerCase()}`;
}

export function biopageKey(hostname: string, handle: string): string {
  return `b:${hostname.toLowerCase()}:${handle.toLowerCase()}`;
}

export function isCurrentKvRecord(value: unknown): value is { v: typeof KV_SCHEMA_VERSION } {
  return typeof value === "object" && value !== null && (value as { v?: unknown }).v === KV_SCHEMA_VERSION;
}

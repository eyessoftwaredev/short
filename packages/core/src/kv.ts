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
};

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

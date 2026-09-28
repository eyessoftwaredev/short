export type DomainRowView = {
  id: string;
  hostname: string;
  status: string;
  sslStatus: string;
  isPlatform: boolean;
  isDefault: boolean;
  rootDestination: string | null;
  notFoundDestination: string | null;
  linkCount: number;
  lastCheckedAt: string | null;
  createdAt: string | null;
  verifiedAt: string | null;
  validationRecords: { type: "TXT" | "HTTP"; name: string; value: string }[];
};

export type OauthReturn = {
  result: "connected" | "error";
  domainId: string | null;
  reason: string | null;
};

export function toDomainRowView(domain: {
  id: string;
  hostname: string;
  status: string;
  sslStatus: string;
  isPlatform: boolean;
  isDefault: boolean;
  rootDestination: string | null;
  notFoundDestination: string | null;
  linkCount?: number;
  lastCheckedAt: Date | null;
  createdAt?: Date | null;
  verifiedAt?: Date | null;
  validationRecords: DomainRowView["validationRecords"];
}): DomainRowView {
  return {
    id: domain.id,
    hostname: domain.hostname,
    status: domain.status,
    sslStatus: domain.sslStatus,
    isPlatform: domain.isPlatform,
    isDefault: domain.isDefault,
    rootDestination: domain.rootDestination,
    notFoundDestination: domain.notFoundDestination,
    linkCount: domain.linkCount ?? 0,
    lastCheckedAt: domain.lastCheckedAt?.toISOString() ?? null,
    createdAt: domain.createdAt?.toISOString() ?? null,
    verifiedAt: domain.verifiedAt?.toISOString() ?? null,
    validationRecords: domain.validationRecords,
  };
}

/**
 * The four states a customer needs to tell apart:
 * - `pending`   — waiting for the DNS records (their move)
 * - `verifying` — records seen, Cloudflare is issuing the certificate (our move)
 * - `live`      — DNS and SSL done, links resolve
 * - `error`     — Cloudflare rejected the hostname or it was suspended
 */
export type DomainState = "pending" | "verifying" | "live" | "error";

/** Cloudflare SSL states that only happen after DCV passed. */
const ISSUING_SSL = new Set(["pending_issuance", "pending_deployment"]);

export function domainState(row: Pick<DomainRowView, "status" | "sslStatus" | "isPlatform">): DomainState {
  if (row.isPlatform || row.status === "active") {
    return "live";
  }
  if (row.status === "error" || row.status === "suspended") {
    return "error";
  }
  if (ISSUING_SSL.has(row.sslStatus)) {
    return "verifying";
  }
  return "pending";
}

export const DOMAIN_STATE_TONE: Record<DomainState, "success" | "warn" | "info" | "danger"> = {
  live: "success",
  pending: "warn",
  verifying: "info",
  error: "danger",
};

/** Message keys (in `domains`) for the badge label and the one-line next step. */
export const DOMAIN_STATE_KEYS: Record<DomainState, { label: string; next: string }> = {
  live: { label: "stateLive", next: "nextLive" },
  pending: { label: "statePending", next: "nextPending" },
  verifying: { label: "stateVerifying", next: "nextVerifying" },
  error: { label: "stateError", next: "nextError" },
};

/** List badge: verified once DNS+SSL landed; everything else is still setup. */
export function listStatus(row: DomainRowView): "verified" | "pending" {
  return domainState(row) === "live" ? "verified" : "pending";
}

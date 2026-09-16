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
    validationRecords: domain.validationRecords,
  };
}

/** List badge: verified once DNS+SSL landed; everything else is still setup. */
export function listStatus(row: DomainRowView): "verified" | "pending" {
  return row.isPlatform || row.status === "active" ? "verified" : "pending";
}

import { isWithinLimit, type PlanDefinition, type PlanFeatures } from "@short/core";
import {
  and,
  biopages,
  count,
  domains,
  eq,
  getDb,
  isNull,
  links,
  member,
  qrCodes,
  usageCounters,
} from "@short/db";
import { QuotaError } from "./action-result";

export type WorkspaceUsage = {
  links: number;
  customDomains: number;
  biopages: number;
  qrCodes: number;
  members: number;
  clicksThisMonth: number;
};

/** `YYYY-MM` in UTC, matching `usage_counters.period`. */
export function currentPeriod(at: Date = new Date()): string {
  return at.toISOString().slice(0, 7);
}

export async function getWorkspaceUsage(workspaceId: string): Promise<WorkspaceUsage> {
  const db = getDb();

  const [linkCount, domainCount, bioCount, qrCount, memberCount, usage] = await Promise.all([
    db
      .select({ value: count() })
      .from(links)
      .where(and(eq(links.workspaceId, workspaceId), isNull(links.disabledAt))),
    db
      .select({ value: count() })
      .from(domains)
      .where(and(eq(domains.workspaceId, workspaceId), eq(domains.isPlatform, false))),
    db.select({ value: count() }).from(biopages).where(eq(biopages.workspaceId, workspaceId)),
    db.select({ value: count() }).from(qrCodes).where(eq(qrCodes.workspaceId, workspaceId)),
    db.select({ value: count() }).from(member).where(eq(member.organizationId, workspaceId)),
    db
      .select({ clicks: usageCounters.clicksTracked })
      .from(usageCounters)
      .where(
        and(eq(usageCounters.workspaceId, workspaceId), eq(usageCounters.period, currentPeriod())),
      )
      .limit(1),
  ]);

  return {
    links: linkCount[0]?.value ?? 0,
    customDomains: domainCount[0]?.value ?? 0,
    biopages: bioCount[0]?.value ?? 0,
    qrCodes: qrCount[0]?.value ?? 0,
    members: memberCount[0]?.value ?? 0,
    clicksThisMonth: usage[0]?.clicks ?? 0,
  };
}

type CountableResource = "links" | "customDomains" | "biopages" | "qrCodes" | "members";

const LIMIT_KEYS: Record<CountableResource, keyof PlanDefinition["limits"]> = {
  links: "links",
  customDomains: "customDomains",
  biopages: "biopages",
  qrCodes: "qrCodes",
  members: "members",
};

const RESOURCE_LABELS: Record<CountableResource, string> = {
  links: "links",
  customDomains: "custom domains",
  biopages: "bio pages",
  qrCodes: "QR codes",
  members: "team members",
};

/**
 * Throws when creating one more of `resource` would exceed the plan. Call before every
 * create mutation; updates are always allowed so a downgrade never locks existing data.
 */
export async function assertQuota(
  workspaceId: string,
  plan: PlanDefinition,
  resource: CountableResource,
): Promise<void> {
  const usage = await getWorkspaceUsage(workspaceId);
  const limit = plan.limits[LIMIT_KEYS[resource]];

  if (!isWithinLimit(limit, usage[resource])) {
    throw new QuotaError(
      `Your ${plan.name} plan allows ${limit} ${RESOURCE_LABELS[resource]}. Upgrade to add more.`,
      resource,
    );
  }
}

const FEATURE_LABELS: Record<keyof PlanFeatures, string> = {
  targeting: "Geo and device targeting",
  abTesting: "A/B testing",
  passwordProtection: "Password-protected links",
  cloaking: "Link cloaking",
  qrLogo: "Custom QR logos",
  webhooks: "Webhooks",
  apiAccess: "API access",
  removeBranding: "Branding removal",
};

export function assertFeature(plan: PlanDefinition, feature: keyof PlanFeatures): void {
  if (!plan.features[feature]) {
    throw new QuotaError(
      `${FEATURE_LABELS[feature]} is not included in the ${plan.name} plan.`,
      feature,
    );
  }
}

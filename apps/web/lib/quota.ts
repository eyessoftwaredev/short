import { isWithinLimit, type PlanDefinition, type PlanFeatures } from "@short/core";
import {
  and,
  biopages,
  count,
  domains,
  eq,
  getDb,
  inArray,
  invitation,
  isNull,
  links,
  member,
  ne,
  qrCodes,
  sql,
  usageCounters,
} from "@short/db";
import { QuotaError } from "./action-result";
import { getWorkspaceOwnerId, listOwnedWorkspaces } from "./workspace";

export type WorkspaceUsage = {
  links: number;
  customDomains: number;
  biopages: number;
  qrCodes: number;
  members: number;
  teams: number;
  clicksThisMonth: number;
};

const EMPTY_USAGE: WorkspaceUsage = {
  links: 0,
  customDomains: 0,
  biopages: 0,
  qrCodes: 0,
  members: 0,
  teams: 0,
  clicksThisMonth: 0,
};

/** `YYYY-MM` in UTC, matching `usage_counters.period`. */
export function currentPeriod(at: Date = new Date()): string {
  return at.toISOString().slice(0, 7);
}

/**
 * Usage for every workspace the billing owner owns. Seats and team slots ignore
 * personal; resource counts include personal and teams.
 */
export async function getOwnerUsage(ownerUserId: string): Promise<WorkspaceUsage> {
  const owned = await listOwnedWorkspaces(ownerUserId);
  if (owned.length === 0) {
    return EMPTY_USAGE;
  }

  const workspaceIds = owned.map((row) => row.id);
  const teamIds = owned.filter((row) => row.kind === "team").map((row) => row.id);
  const db = getDb();

  const [linkCount, domainCount, bioCount, qrCount, seatCount, inviteCount, usage] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(links)
        .where(and(inArray(links.workspaceId, workspaceIds), isNull(links.disabledAt))),
      db
        .select({ value: count() })
        .from(domains)
        .where(and(inArray(domains.workspaceId, workspaceIds), eq(domains.isPlatform, false))),
      db.select({ value: count() }).from(biopages).where(inArray(biopages.workspaceId, workspaceIds)),
      db.select({ value: count() }).from(qrCodes).where(inArray(qrCodes.workspaceId, workspaceIds)),
      teamIds.length === 0
        ? Promise.resolve([{ value: 0 }])
        : db
            .select({ value: count() })
            .from(member)
            .where(and(inArray(member.organizationId, teamIds), ne(member.role, "owner"))),
      teamIds.length === 0
        ? Promise.resolve([{ value: 0 }])
        : db
            .select({ value: count() })
            .from(invitation)
            .where(
              and(inArray(invitation.organizationId, teamIds), eq(invitation.status, "pending")),
            ),
      db
        .select({
          clicks: sql<number>`coalesce(sum(${usageCounters.clicksTracked}), 0)`,
        })
        .from(usageCounters)
        .where(
          and(
            inArray(usageCounters.workspaceId, workspaceIds),
            eq(usageCounters.period, currentPeriod()),
          ),
        ),
    ]);

  return {
    links: linkCount[0]?.value ?? 0,
    customDomains: domainCount[0]?.value ?? 0,
    biopages: bioCount[0]?.value ?? 0,
    qrCodes: qrCount[0]?.value ?? 0,
    members: (seatCount[0]?.value ?? 0) + (inviteCount[0]?.value ?? 0),
    teams: teamIds.length,
    clicksThisMonth: Number(usage[0]?.clicks ?? 0),
  };
}

export async function getWorkspaceUsage(workspaceId: string): Promise<WorkspaceUsage> {
  const ownerId = await getWorkspaceOwnerId(workspaceId);
  if (!ownerId) {
    return EMPTY_USAGE;
  }
  return getOwnerUsage(ownerId);
}

type CountableResource = "links" | "customDomains" | "biopages" | "qrCodes" | "members" | "teams";

const LIMIT_KEYS: Record<CountableResource, keyof PlanDefinition["limits"]> = {
  links: "links",
  customDomains: "customDomains",
  biopages: "biopages",
  qrCodes: "qrCodes",
  members: "members",
  teams: "teams",
};

const RESOURCE_LABELS: Record<CountableResource, string> = {
  links: "links",
  customDomains: "custom domains",
  biopages: "bio pages",
  qrCodes: "QR codes",
  members: "team members",
  teams: "teams",
};

export async function assertOwnerQuota(
  ownerUserId: string,
  plan: PlanDefinition,
  resource: CountableResource,
): Promise<void> {
  const usage = await getOwnerUsage(ownerUserId);
  const limit = plan.limits[LIMIT_KEYS[resource]] ?? 0;

  if (!isWithinLimit(limit, usage[resource])) {
    throw new QuotaError(
      `Your ${plan.name} plan allows ${limit} ${RESOURCE_LABELS[resource]}. Upgrade to add more.`,
      resource,
    );
  }
}

/**
 * Throws when creating one more of `resource` would exceed the plan. Call before every
 * create mutation; updates are always allowed so a downgrade never locks existing data.
 */
export async function assertQuota(
  workspaceId: string,
  plan: PlanDefinition,
  resource: CountableResource,
): Promise<void> {
  const ownerId = await getWorkspaceOwnerId(workspaceId);
  if (!ownerId) {
    throw new QuotaError(`Your ${plan.name} plan does not allow more ${RESOURCE_LABELS[resource]}.`, resource);
  }
  await assertOwnerQuota(ownerId, plan, resource);
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

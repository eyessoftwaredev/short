import type { PlanKey } from "@short/core";
import {
  and,
  auditLogs,
  biopages,
  count,
  desc,
  domains,
  eq,
  getDb,
  gte,
  ilike,
  inArray,
  isNotNull,
  links,
  member,
  organization,
  plans,
  qrCodes,
  sql,
  subscriptions,
  user,
  type AuditLogRow,
} from "@short/db";

export const ADMIN_PAGE_SIZE = 25;

export type PlatformCounts = {
  users: number;
  workspaces: number;
  links: number;
  biopages: number;
  qrCodes: number;
  customDomains: number;
  bannedUsers: number;
  flaggedLinks: number;
  pendingDomains: number;
  newUsers7d: number;
  newLinks7d: number;
};

function sevenDaysAgo(): Date {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

export async function getPlatformCounts(): Promise<PlatformCounts> {
  const db = getDb();
  const since = sevenDaysAgo();

  const [
    users,
    workspaces,
    linkRows,
    bioRows,
    qrRows,
    domainRows,
    banned,
    flagged,
    pending,
    newUsers,
    newLinks,
  ] = await Promise.all([
    db.select({ value: count() }).from(user),
    db.select({ value: count() }).from(organization),
    db.select({ value: count() }).from(links),
    db.select({ value: count() }).from(biopages),
    db.select({ value: count() }).from(qrCodes),
    db.select({ value: count() }).from(domains).where(eq(domains.isPlatform, false)),
    db.select({ value: count() }).from(user).where(eq(user.banned, true)),
    db.select({ value: count() }).from(links).where(isNotNull(links.abuseFlaggedAt)),
    db.select({ value: count() }).from(domains).where(eq(domains.status, "pending")),
    db.select({ value: count() }).from(user).where(gte(user.createdAt, since)),
    db.select({ value: count() }).from(links).where(gte(links.createdAt, since)),
  ]);

  return {
    users: users[0]?.value ?? 0,
    workspaces: workspaces[0]?.value ?? 0,
    links: linkRows[0]?.value ?? 0,
    biopages: bioRows[0]?.value ?? 0,
    qrCodes: qrRows[0]?.value ?? 0,
    customDomains: domainRows[0]?.value ?? 0,
    bannedUsers: banned[0]?.value ?? 0,
    flaggedLinks: flagged[0]?.value ?? 0,
    pendingDomains: pending[0]?.value ?? 0,
    newUsers7d: newUsers[0]?.value ?? 0,
    newLinks7d: newLinks[0]?.value ?? 0,
  };
}

export type PlanDistributionRow = {
  planKey: PlanKey;
  name: string;
  workspaces: number;
  mrr: number;
};

/** MRR normalises yearly subscriptions to a monthly figure. */
export async function getPlanDistribution(): Promise<PlanDistributionRow[]> {
  const rows = await getDb()
    .select({
      planKey: plans.key,
      name: plans.name,
      priceMonthly: plans.priceMonthly,
      priceYearly: plans.priceYearly,
      interval: subscriptions.interval,
      status: subscriptions.status,
      value: count(subscriptions.id),
    })
    .from(plans)
    .leftJoin(subscriptions, eq(subscriptions.planKey, plans.key))
    .groupBy(
      plans.key,
      plans.name,
      plans.priceMonthly,
      plans.priceYearly,
      plans.sortOrder,
      subscriptions.interval,
      subscriptions.status,
    )
    .orderBy(plans.sortOrder);

  const merged = new Map<PlanKey, PlanDistributionRow>();

  for (const row of rows) {
    const entry = merged.get(row.planKey) ?? {
      planKey: row.planKey,
      name: row.name,
      workspaces: 0,
      mrr: 0,
    };

    entry.workspaces += row.value;

    if (row.status === "active" || row.status === "trialing") {
      const monthly =
        row.interval === "year" ? Math.round(row.priceYearly / 12) : row.priceMonthly;
      entry.mrr += monthly * row.value;
    }

    merged.set(row.planKey, entry);
  }

  return [...merged.values()];
}

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  banReason: string | null;
  emailVerified: boolean;
  createdAt: Date;
  workspaces: number;
};

export async function listUsers(options: {
  search?: string;
  status?: "all" | "banned" | "unverified" | "superadmin";
  page?: number;
}): Promise<{ items: AdminUserRow[]; total: number }> {
  const db = getDb();
  const page = Math.max(1, options.page ?? 1);
  const search = options.search?.trim();

  const filters = [];
  if (search) {
    filters.push(
      sql`(${user.email} ILIKE ${`%${search}%`} OR ${user.name} ILIKE ${`%${search}%`})`,
    );
  }
  if (options.status === "banned") {
    filters.push(eq(user.banned, true));
  }
  if (options.status === "unverified") {
    filters.push(eq(user.emailVerified, false));
  }
  if (options.status === "superadmin") {
    filters.push(eq(user.role, "superadmin"));
  }
  const where = filters.length > 0 ? and(...filters) : undefined;

  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
    db.select({ value: count() }).from(user).where(where),
  ]);

  const counts =
    rows.length === 0
      ? []
      : await db
          .select({ userId: member.userId, value: count() })
          .from(member)
          .where(
            inArray(
              member.userId,
              rows.map((row) => row.id),
            ),
          )
          .groupBy(member.userId);

  const byUser = new Map(counts.map((row) => [row.userId, row.value]));

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      banned: row.banned,
      banReason: row.banReason,
      emailVerified: row.emailVerified,
      createdAt: row.createdAt,
      workspaces: byUser.get(row.id) ?? 0,
    })),
    total: totals[0]?.value ?? 0,
  };
}

export type AdminWorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  planKey: PlanKey;
  planName: string;
  status: string;
  members: number;
  links: number;
  ownerEmail: string | null;
};

export async function listWorkspaces(options: {
  search?: string;
  planKey?: string;
  page?: number;
}): Promise<{ items: AdminWorkspaceRow[]; total: number }> {
  const db = getDb();
  const page = Math.max(1, options.page ?? 1);
  const search = options.search?.trim();

  const filters = [];
  if (search) {
    filters.push(
      sql`(${organization.name} ILIKE ${`%${search}%`} OR ${organization.slug} ILIKE ${`%${search}%`})`,
    );
  }
  if (options.planKey && options.planKey !== "all") {
    filters.push(eq(subscriptions.planKey, options.planKey as PlanKey));
  }
  const where = filters.length > 0 ? and(...filters) : undefined;

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        createdAt: organization.createdAt,
        planKey: subscriptions.planKey,
        planName: plans.name,
        status: subscriptions.status,
      })
      .from(organization)
      .leftJoin(subscriptions, eq(subscriptions.workspaceId, organization.id))
      .leftJoin(plans, eq(subscriptions.planKey, plans.key))
      .where(where)
      .orderBy(desc(organization.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
    db
      .select({ value: count() })
      .from(organization)
      .leftJoin(subscriptions, eq(subscriptions.workspaceId, organization.id))
      .where(where),
  ]);

  if (rows.length === 0) {
    return { items: [], total: totals[0]?.value ?? 0 };
  }

  const ids = rows.map((row) => row.id);

  const [memberCounts, linkCounts, owners] = await Promise.all([
    db
      .select({ workspaceId: member.organizationId, value: count() })
      .from(member)
      .where(inArray(member.organizationId, ids))
      .groupBy(member.organizationId),
    db
      .select({ workspaceId: links.workspaceId, value: count() })
      .from(links)
      .where(inArray(links.workspaceId, ids))
      .groupBy(links.workspaceId),
    db
      .select({ workspaceId: member.organizationId, email: user.email })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(and(inArray(member.organizationId, ids), eq(member.role, "owner"))),
  ]);

  const members = new Map(memberCounts.map((row) => [row.workspaceId, row.value]));
  const linkTotals = new Map(linkCounts.map((row) => [row.workspaceId, row.value]));
  const ownerEmails = new Map(owners.map((row) => [row.workspaceId, row.email]));

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      createdAt: row.createdAt,
      planKey: row.planKey ?? "free",
      planName: row.planName ?? "Free",
      status: row.status ?? "active",
      members: members.get(row.id) ?? 0,
      links: linkTotals.get(row.id) ?? 0,
      ownerEmail: ownerEmails.get(row.id) ?? null,
    })),
    total: totals[0]?.value ?? 0,
  };
}

export type AdminLinkRow = {
  id: string;
  slug: string;
  hostname: string;
  destination: string;
  workspaceId: string;
  workspaceName: string;
  createdAt: Date;
  abuseFlaggedAt: Date | null;
  abuseReason: string | null;
  disabledAt: Date | null;
};

export async function searchLinks(options: {
  search?: string;
  status?: "all" | "flagged" | "disabled";
  workspaceId?: string;
  page?: number;
}): Promise<{ items: AdminLinkRow[]; total: number }> {
  const db = getDb();
  const page = Math.max(1, options.page ?? 1);
  const search = options.search?.trim();

  const filters = [];
  if (options.workspaceId) {
    filters.push(eq(links.workspaceId, options.workspaceId));
  }
  if (search) {
    filters.push(
      sql`(${links.slug} ILIKE ${`%${search}%`} OR ${links.destination} ILIKE ${`%${search}%`} OR ${domains.hostname} ILIKE ${`%${search}%`})`,
    );
  }
  if (options.status === "flagged") {
    filters.push(isNotNull(links.abuseFlaggedAt));
  }
  if (options.status === "disabled") {
    filters.push(isNotNull(links.disabledAt));
  }
  const where = filters.length > 0 ? and(...filters) : undefined;

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: links.id,
        slug: links.slug,
        hostname: domains.hostname,
        destination: links.destination,
        workspaceId: links.workspaceId,
        workspaceName: organization.name,
        createdAt: links.createdAt,
        abuseFlaggedAt: links.abuseFlaggedAt,
        abuseReason: links.abuseReason,
        disabledAt: links.disabledAt,
      })
      .from(links)
      .innerJoin(domains, eq(links.domainId, domains.id))
      .innerJoin(organization, eq(links.workspaceId, organization.id))
      .where(where)
      .orderBy(desc(links.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
    db
      .select({ value: count() })
      .from(links)
      .innerJoin(domains, eq(links.domainId, domains.id))
      .where(where),
  ]);

  return { items: rows, total: totals[0]?.value ?? 0 };
}

export type AdminDomainRow = {
  id: string;
  hostname: string;
  status: string;
  sslStatus: string;
  isPlatform: boolean;
  workspaceId: string;
  workspaceName: string;
  linkCount: number;
  lastCheckedAt: Date | null;
  createdAt: Date;
};

export async function listAllDomains(options: {
  status?: string;
  page?: number;
}): Promise<{ items: AdminDomainRow[]; total: number }> {
  const db = getDb();
  const page = Math.max(1, options.page ?? 1);

  const filters = [];
  if (options.status && options.status !== "all") {
    filters.push(eq(domains.status, options.status as "pending"));
  }
  const where = filters.length > 0 ? and(...filters) : undefined;

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: domains.id,
        hostname: domains.hostname,
        status: domains.status,
        sslStatus: domains.sslStatus,
        isPlatform: domains.isPlatform,
        workspaceId: domains.workspaceId,
        workspaceName: organization.name,
        lastCheckedAt: domains.lastCheckedAt,
        createdAt: domains.createdAt,
      })
      .from(domains)
      .innerJoin(organization, eq(domains.workspaceId, organization.id))
      .where(where)
      .orderBy(desc(domains.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
    db.select({ value: count() }).from(domains).where(where),
  ]);

  if (rows.length === 0) {
    return { items: [], total: totals[0]?.value ?? 0 };
  }

  const counts = await db
    .select({ domainId: links.domainId, value: count() })
    .from(links)
    .where(
      inArray(
        links.domainId,
        rows.map((row) => row.id),
      ),
    )
    .groupBy(links.domainId);

  const byDomain = new Map(counts.map((row) => [row.domainId, row.value]));

  return {
    items: rows.map((row) => ({ ...row, linkCount: byDomain.get(row.id) ?? 0 })),
    total: totals[0]?.value ?? 0,
  };
}

export type AuditEntryRow = AuditLogRow & {
  actorName: string | null;
  actorEmail: string | null;
  workspaceName: string | null;
};

export async function listAuditLogs(options: {
  action?: string;
  workspaceId?: string;
  page?: number;
}): Promise<{ items: AuditEntryRow[]; total: number }> {
  const db = getDb();
  const page = Math.max(1, options.page ?? 1);

  const filters = [];
  if (options.action && options.action !== "all") {
    filters.push(ilike(auditLogs.action, `${options.action}%`));
  }
  if (options.workspaceId) {
    filters.push(eq(auditLogs.workspaceId, options.workspaceId));
  }
  const where = filters.length > 0 ? and(...filters) : undefined;

  const [rows, totals] = await Promise.all([
    db
      .select({
        log: auditLogs,
        actorName: user.name,
        actorEmail: user.email,
        workspaceName: organization.name,
      })
      .from(auditLogs)
      .leftJoin(user, eq(auditLogs.actorId, user.id))
      .leftJoin(organization, eq(auditLogs.workspaceId, organization.id))
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
    db.select({ value: count() }).from(auditLogs).where(where),
  ]);

  return {
    items: rows.map((row) => ({
      ...row.log,
      actorName: row.actorName,
      actorEmail: row.actorEmail,
      workspaceName: row.workspaceName,
    })),
    total: totals[0]?.value ?? 0,
  };
}

/** Distinct action prefixes (`link`, `billing`, ...) used to build the filter bar. */
export async function listAuditActionGroups(): Promise<string[]> {
  const rows = await getDb()
    .select({ action: auditLogs.action })
    .from(auditLogs)
    .groupBy(auditLogs.action)
    .limit(200);

  const groups = new Set(rows.map((row) => row.action.split(".")[0] ?? row.action));
  return [...groups].sort();
}
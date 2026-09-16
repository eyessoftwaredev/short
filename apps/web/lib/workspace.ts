import { slugify } from "@short/core";
import {
  and,
  asc,
  eq,
  getDb,
  member,
  organization,
  plans,
  subscriptions,
  user,
  type WorkspaceKind,
} from "@short/db";

export type { WorkspaceKind };

export function asWorkspaceKind(value: string | null | undefined): WorkspaceKind {
  return value === "team" ? "team" : "personal";
}

export async function uniqueWorkspaceSlug(base: string): Promise<string> {
  const db = getDb();
  const root = slugify(base) || "workspace";

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const existing = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.slug, candidate))
      .limit(1);
    if (existing.length === 0) {
      return candidate;
    }
  }

  return `${root}-${crypto.randomUUID().slice(0, 8)}`;
}

async function defaultPlanKey(
  db: ReturnType<typeof getDb>,
  userId: string,
): Promise<"free" | "infinity"> {
  const [account] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (account?.role !== "superadmin") {
    return "free";
  }

  const [infinity] = await db
    .select({ key: plans.key })
    .from(plans)
    .where(eq(plans.key, "infinity"))
    .limit(1);
  return infinity ? "infinity" : "free";
}

export async function ensureUserSubscription(userId: string): Promise<void> {
  const db = getDb();
  const [existing] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  if (existing) {
    return;
  }

  await db.insert(subscriptions).values({
    userId,
    planKey: await defaultPlanKey(db, userId),
    status: "active",
  });
}

export type CreatedWorkspace = { id: string; name: string; slug: string; kind: WorkspaceKind };

/**
 * Creates a workspace with the caller as owner. Personal workspaces also ensure the
 * caller has a user-scoped subscription. Teams never open a second subscription.
 */
export async function createWorkspace(
  userId: string,
  name: string,
  fallback = "Workspace",
  kind: WorkspaceKind = "personal",
): Promise<CreatedWorkspace> {
  const db = getDb();
  const workspaceName = name.trim() === "" ? fallback : name.trim();
  const id = crypto.randomUUID();
  const slug = await uniqueWorkspaceSlug(workspaceName);

  await db.insert(organization).values({ id, name: workspaceName, slug, kind });
  await db.insert(member).values({
    id: crypto.randomUUID(),
    organizationId: id,
    userId,
    role: "owner",
  });

  if (kind === "personal") {
    await ensureUserSubscription(userId);
  }

  return { id, name: workspaceName, slug, kind };
}

export async function getWorkspaceOwnerId(workspaceId: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ userId: member.userId })
    .from(member)
    .where(and(eq(member.organizationId, workspaceId), eq(member.role, "owner")))
    .orderBy(asc(member.createdAt))
    .limit(1);
  return row?.userId ?? null;
}

export type OwnedWorkspace = { id: string; kind: WorkspaceKind };

export async function listOwnedWorkspaces(userId: string): Promise<OwnedWorkspace[]> {
  const rows = await getDb()
    .select({ id: organization.id, kind: organization.kind })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(and(eq(member.userId, userId), eq(member.role, "owner")));

  return rows.map((row) => ({ id: row.id, kind: asWorkspaceKind(row.kind) }));
}

export async function getPersonalWorkspaceId(userId: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ id: organization.id })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(
      and(
        eq(member.userId, userId),
        eq(member.role, "owner"),
        eq(organization.kind, "personal"),
      ),
    )
    .orderBy(asc(organization.createdAt))
    .limit(1);
  return row?.id ?? null;
}

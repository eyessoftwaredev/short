import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPlan, type PlanDefinition } from "@short/core";
import { eq, getDb, member, organization, plans, subscriptions } from "@short/db";
import { auth, SUPERADMIN_ROLE } from "./auth";

export type WorkspaceRole = "owner" | "admin" | "member";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
};

export type SessionContext = {
  user: { id: string; name: string; email: string; image: string | null; role: string };
  isSuperadmin: boolean;
  /** Set while a superadmin is impersonating; every audit entry records it. */
  impersonatedBy: string | null;
  workspace: Workspace | null;
  /** Every workspace the user belongs to, for the sidebar switcher. */
  workspaces: Workspace[];
  role: WorkspaceRole | null;
  plan: PlanDefinition;
  subscriptionStatus: string;
};

/**
 * Resolved once per request. `cache` keeps layout, page and server actions from each
 * issuing their own session + workspace queries.
 */
export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return null;
  }

  const db = getDb();
  const userId = session.user.id;
  const isSuperadmin = session.user.role === SUPERADMIN_ROLE;

  const memberships = await db
    .select({
      role: member.role,
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId))
    .limit(20);

  // An active id that no longer resolves (workspace deleted, membership revoked) falls
  // back to any remaining membership rather than locking the user out.
  const activeId = session.session.activeOrganizationId ?? null;
  const current = memberships.find((row) => row.id === activeId) ?? memberships[0];

  let plan = getPlan("free");
  let subscriptionStatus = "active";

  if (current) {
    const [row] = await db
      .select({
        planKey: subscriptions.planKey,
        status: subscriptions.status,
        limits: plans.limits,
        features: plans.features,
        name: plans.name,
      })
      .from(subscriptions)
      .leftJoin(plans, eq(subscriptions.planKey, plans.key))
      .where(eq(subscriptions.workspaceId, current.id))
      .limit(1);

    if (row) {
      subscriptionStatus = row.status;
      const base = getPlan(row.planKey);
      // Admin-edited limits in Postgres win over the compiled-in defaults.
      plan = {
        ...base,
        name: row.name ?? base.name,
        limits: row.limits ?? base.limits,
        features: row.features ?? base.features,
      };
    }
  }

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
      role: session.user.role ?? "user",
    },
    isSuperadmin,
    impersonatedBy: session.session.impersonatedBy ?? null,
    workspace: current
      ? { id: current.id, name: current.name, slug: current.slug, logo: current.logo }
      : null,
    workspaces: memberships.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      logo: row.logo,
    })),
    role: (current?.role as WorkspaceRole | undefined) ?? null,
    plan,
    subscriptionStatus,
  };
});

export async function requireSession(): Promise<SessionContext> {
  const context = await getSessionContext();
  if (!context) {
    redirect("/login");
  }
  return context;
}

export type WorkspaceContext = SessionContext & { workspace: Workspace; role: WorkspaceRole };

export async function requireWorkspace(): Promise<WorkspaceContext> {
  const context = await requireSession();
  if (!context.workspace || !context.role) {
    redirect("/onboarding");
  }
  return context as WorkspaceContext;
}

const ROLE_RANK: Record<WorkspaceRole, number> = { member: 0, admin: 1, owner: 2 };

export function hasWorkspaceRole(role: WorkspaceRole, minimum: WorkspaceRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export async function requireWorkspaceRole(minimum: WorkspaceRole): Promise<WorkspaceContext> {
  const context = await requireWorkspace();
  if (!hasWorkspaceRole(context.role, minimum) && !context.isSuperadmin) {
    redirect("/dashboard?error=forbidden");
  }
  return context;
}

export async function requireSuperadmin(): Promise<SessionContext> {
  const context = await requireSession();
  if (!context.isSuperadmin) {
    redirect("/dashboard?error=forbidden");
  }
  return context;
}

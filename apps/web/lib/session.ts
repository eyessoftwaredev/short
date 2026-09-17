import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPlan, isWithinLimit, type PlanDefinition } from "@short/core";
import { and, asc, eq, getDb, member, organization, plans, subscriptions, user } from "@short/db";
import { auth, SUPERADMIN_ROLE } from "./auth";
import { verifyPendingPath } from "./verify-path";
import { asWorkspaceKind, type WorkspaceKind } from "./workspace";

export type WorkspaceRole = "owner" | "admin" | "member";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  kind: WorkspaceKind;
};

export type BillingOwner = {
  id: string;
  name: string;
};

export type SessionContext = {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: string;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
  };
  isSuperadmin: boolean;
  /** Set while a superadmin is impersonating; every audit entry records it. */
  impersonatedBy: string | null;
  workspace: Workspace | null;
  /** Every workspace the user belongs to, for the sidebar switcher. */
  workspaces: Workspace[];
  role: WorkspaceRole | null;
  /** Plan of the active workspace's billing owner — quota for work in this workspace. */
  plan: PlanDefinition;
  /** Signed-in user's own plan — team slots and their Stripe subscription. */
  accountPlan: PlanDefinition;
  subscriptionStatus: string;
  billingOwner: BillingOwner | null;
  isBillingOwner: boolean;
  canCreateTeam: boolean;
};

function mergePlan(
  planKey: string | null | undefined,
  limits: PlanDefinition["limits"] | null | undefined,
  features: PlanDefinition["features"] | null | undefined,
  name: string | null | undefined,
): PlanDefinition {
  const base = getPlan(planKey);
  return {
    ...base,
    name: name ?? base.name,
    limits: { ...base.limits, ...(limits ?? {}) },
    features: { ...base.features, ...(features ?? {}) },
  };
}

async function loadUserPlan(userId: string): Promise<{
  plan: PlanDefinition;
  status: string;
}> {
  const [row] = await getDb()
    .select({
      planKey: subscriptions.planKey,
      status: subscriptions.status,
      limits: plans.limits,
      features: plans.features,
      name: plans.name,
    })
    .from(subscriptions)
    .leftJoin(plans, eq(subscriptions.planKey, plans.key))
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!row) {
    return { plan: getPlan("free"), status: "active" };
  }

  return { plan: mergePlan(row.planKey, row.limits, row.features, row.name), status: row.status };
}

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
      kind: organization.kind,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId))
    .limit(20);

  // An active id that no longer resolves (workspace deleted, membership revoked) falls
  // back to any remaining membership rather than locking the user out.
  const activeId = session.session.activeOrganizationId ?? null;
  const current = memberships.find((row) => row.id === activeId) ?? memberships[0];

  const own = await loadUserPlan(userId);
  let accountPlan = own.plan;
  let plan = own.plan;
  let subscriptionStatus = own.status;
  let billingOwner: BillingOwner | null = {
    id: userId,
    name: session.user.name,
  };

  if (current) {
    const [owner] = await db
      .select({ userId: member.userId, name: user.name })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(and(eq(member.organizationId, current.id), eq(member.role, "owner")))
      .orderBy(asc(member.createdAt))
      .limit(1);

    if (owner) {
      billingOwner = { id: owner.userId, name: owner.name };
      if (owner.userId !== userId) {
        const billed = await loadUserPlan(owner.userId);
        plan = billed.plan;
        subscriptionStatus = billed.status;
      }
    }
  }

  // Platform admins sit outside the commercial catalogue. Impersonation swaps
  // `session.user`, so a support session still inherits the target's plan.
  if (isSuperadmin) {
    accountPlan = getPlan("infinity");
    plan = getPlan("infinity");
    subscriptionStatus = "active";
  }

  const ownedTeams = memberships.filter(
    (row) => row.role === "owner" && asWorkspaceKind(row.kind) === "team",
  ).length;

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
      role: session.user.role ?? "user",
      emailVerified: Boolean(session.user.emailVerified),
      twoFactorEnabled: Boolean(
        "twoFactorEnabled" in session.user && session.user.twoFactorEnabled,
      ),
    },
    isSuperadmin,
    impersonatedBy: session.session.impersonatedBy ?? null,
    workspace: current
      ? {
          id: current.id,
          name: current.name,
          slug: current.slug,
          logo: current.logo,
          kind: asWorkspaceKind(current.kind),
        }
      : null,
    workspaces: memberships.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      logo: row.logo,
      kind: asWorkspaceKind(row.kind),
    })),
    role: (current?.role as WorkspaceRole | undefined) ?? null,
    plan,
    accountPlan,
    subscriptionStatus,
    billingOwner,
    isBillingOwner: billingOwner?.id === userId,
    canCreateTeam: isSuperadmin || isWithinLimit(accountPlan.limits.teams, ownedTeams),
  };
});

export async function requireSession(): Promise<SessionContext> {
  const context = await getSessionContext();
  if (!context) {
    redirect("/login");
  }
  if (!context.user.emailVerified) {
    redirect(verifyPendingPath());
  }
  return context;
}

export async function redirectIfAuthenticated(to = "/dashboard"): Promise<void> {
  const context = await getSessionContext();
  if (!context) {
    return;
  }
  if (!context.user.emailVerified) {
    redirect(verifyPendingPath());
  }
  redirect(to);
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

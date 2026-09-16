import {
  and,
  apikey,
  asc,
  desc,
  eq,
  getDb,
  gte,
  invitation,
  member,
  organization,
  sql,
  user,
} from "@short/db";

export type TeamMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  joinedAt: Date;
};

export type PendingInvite = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  inviterEmail: string | null;
};

export type ApiKeyView = {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  enabled: boolean;
  requestCount: number;
  lastRequest: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
};

export async function listMembers(workspaceId: string): Promise<TeamMember[]> {
  const rows = await getDb()
    .select({
      id: member.id,
      userId: member.userId,
      name: user.name,
      email: user.email,
      image: user.image,
      role: member.role,
      joinedAt: member.createdAt,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, workspaceId))
    .orderBy(asc(member.createdAt));

  return rows;
}

export async function listInvites(workspaceId: string): Promise<PendingInvite[]> {
  const rows = await getDb()
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      inviterEmail: user.email,
    })
    .from(invitation)
    .leftJoin(user, eq(invitation.inviterId, user.id))
    .where(and(eq(invitation.organizationId, workspaceId), eq(invitation.status, "pending")));

  return rows;
}

/** Keys are workspace-scoped, so `referenceId` is the workspace id. */
export async function listApiKeys(workspaceId: string): Promise<ApiKeyView[]> {
  return getDb()
    .select({
      id: apikey.id,
      name: apikey.name,
      start: apikey.start,
      prefix: apikey.prefix,
      enabled: apikey.enabled,
      requestCount: apikey.requestCount,
      lastRequest: apikey.lastRequest,
      expiresAt: apikey.expiresAt,
      createdAt: apikey.createdAt,
    })
    .from(apikey)
    .where(eq(apikey.referenceId, workspaceId))
    .orderBy(desc(apikey.createdAt));
}

export type PublicInvite = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  workspaceId: string;
  workspaceName: string;
};

export function isInviteUsable(invite: Pick<PublicInvite, "status" | "expiresAt">): boolean {
  return invite.status === "pending" && invite.expiresAt.getTime() >= Date.now();
}

export async function userExistsByEmail(email: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email.trim().toLowerCase()))
    .limit(1);
  return Boolean(row);
}

/** True when a still-open invite was sent to this inbox — that click already proved ownership. */
export async function hasPendingInviteForEmail(email: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: invitation.id })
    .from(invitation)
    .where(
      and(
        sql`lower(${invitation.email}) = ${email.trim().toLowerCase()}`,
        eq(invitation.status, "pending"),
        gte(invitation.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/** Safe to show on the public /invite/[id] page — no inviter identity beyond the workspace name. */
export async function getPublicInvite(id: string): Promise<PublicInvite | null> {
  const [row] = await getDb()
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      workspaceId: organization.id,
      workspaceName: organization.name,
    })
    .from(invitation)
    .innerJoin(organization, eq(invitation.organizationId, organization.id))
    .where(eq(invitation.id, id))
    .limit(1);
  return row ?? null;
}

export async function getWorkspaceProfile(
  workspaceId: string,
): Promise<{ name: string; slug: string } | null> {
  const [row] = await getDb()
    .select({ name: organization.name, slug: organization.slug })
    .from(organization)
    .where(eq(organization.id, workspaceId))
    .limit(1);
  return row ?? null;
}

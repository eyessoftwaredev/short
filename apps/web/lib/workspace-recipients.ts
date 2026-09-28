import { and, eq, getDb, inArray, isNull, member, organization, user } from "@short/db";

export type WorkspaceRecipient = { userId: string; email: string; name: string };

/**
 * Who gets workspace notifications (health alerts, weekly digest): owners and admins
 * with a verified address whose account is usable — not banned (or the ban expired),
 * not deactivated, and not scheduled for deletion.
 */
export async function listWorkspaceAlertRecipients(workspaceId: string): Promise<WorkspaceRecipient[]> {
  const rows = await getDb()
    .select({
      userId: user.id,
      email: user.email,
      name: user.name,
      banned: user.banned,
      banExpires: user.banExpires,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(
      and(
        eq(member.organizationId, workspaceId),
        inArray(member.role, ["owner", "admin"]),
        eq(user.emailVerified, true),
        isNull(user.deactivatedAt),
        isNull(user.deletionScheduledAt),
      ),
    );

  const now = Date.now();
  const seen = new Set<string>();
  const recipients: WorkspaceRecipient[] = [];
  for (const row of rows) {
    const banActive = row.banned && (row.banExpires == null || row.banExpires.getTime() > now);
    const email = row.email.trim().toLowerCase();
    if (banActive || email === "" || seen.has(email)) {
      continue;
    }
    seen.add(email);
    recipients.push({ userId: row.userId, email: row.email, name: row.name });
  }
  return recipients;
}

export async function getWorkspaceDisplayName(workspaceId: string): Promise<string> {
  const [row] = await getDb()
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, workspaceId))
    .limit(1);
  return row?.name ?? "";
}

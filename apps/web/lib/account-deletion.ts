import {
  ACCOUNT_DELETION_BAN_REASON,
  isScheduledDeletionDue,
  scheduledDeletionAt,
  shouldCancelScheduledDeletion,
} from "@short/core";
import { and, eq, getDb, isNotNull, isNull, lte, member, organization, session, user } from "@short/db";

export { ACCOUNT_DELETION_BAN_REASON, scheduledDeletionAt } from "@short/core";

export async function listSoleOwnedTeamNames(userId: string): Promise<string[]> {
  const db = getDb();
  const owned = await db
    .select({ id: organization.id, name: organization.name })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(and(eq(member.userId, userId), eq(member.role, "owner"), eq(organization.kind, "team")));

  const names: string[] = [];
  for (const row of owned) {
    const owners = await db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.organizationId, row.id), eq(member.role, "owner")));
    if (owners.length <= 1) {
      names.push(row.name);
    }
  }
  return names;
}

export async function revokeUserSessions(userId: string): Promise<void> {
  await getDb().delete(session).where(eq(session.userId, userId));
}

export async function scheduleAccountDeletion(userId: string, now = new Date()): Promise<Date> {
  const due = scheduledDeletionAt(now);
  await getDb()
    .update(user)
    .set({ deletionScheduledAt: due, updatedAt: now })
    .where(eq(user.id, userId));
  await revokeUserSessions(userId);
  return due;
}

export async function cancelScheduledDeletion(userId: string, now = new Date()): Promise<boolean> {
  const [row] = await getDb()
    .select({
      deletionScheduledAt: user.deletionScheduledAt,
      deactivatedAt: user.deactivatedAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!row || !shouldCancelScheduledDeletion(row.deletionScheduledAt, row.deactivatedAt, now)) {
    return false;
  }

  await getDb()
    .update(user)
    .set({ deletionScheduledAt: null, updatedAt: now })
    .where(eq(user.id, userId));
  return true;
}

export async function loadAccountLifecycle(userId: string): Promise<{
  deletionScheduledAt: Date | null;
  deactivatedAt: Date | null;
}> {
  const [row] = await getDb()
    .select({
      deletionScheduledAt: user.deletionScheduledAt,
      deactivatedAt: user.deactivatedAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return {
    deletionScheduledAt: row?.deletionScheduledAt ?? null,
    deactivatedAt: row?.deactivatedAt ?? null,
  };
}

export async function finalizeDueAccountDeletions(now = new Date()): Promise<number> {
  const db = getDb();
  const due = await db
    .select({ id: user.id })
    .from(user)
    .where(
      and(
        isNotNull(user.deletionScheduledAt),
        lte(user.deletionScheduledAt, now),
        isNull(user.deactivatedAt),
      ),
    );

  for (const row of due) {
    const [account] = await db
      .select({ deletionScheduledAt: user.deletionScheduledAt, deactivatedAt: user.deactivatedAt })
      .from(user)
      .where(eq(user.id, row.id))
      .limit(1);
    if (!account?.deletionScheduledAt || account.deactivatedAt) {
      continue;
    }
    if (!isScheduledDeletionDue(account.deletionScheduledAt, now)) {
      continue;
    }

    await db
      .update(user)
      .set({
        banned: true,
        banReason: ACCOUNT_DELETION_BAN_REASON,
        deactivatedAt: now,
        deletionScheduledAt: null,
        updatedAt: now,
      })
      .where(eq(user.id, row.id));
    await revokeUserSessions(row.id);
  }

  return due.length;
}

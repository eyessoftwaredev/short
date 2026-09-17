/** Facebook-style grace before an account is irreversibly deactivated. */
export const ACCOUNT_DELETION_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export const ACCOUNT_DELETION_BAN_REASON = "self_deactivated";

export function scheduledDeletionAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + ACCOUNT_DELETION_GRACE_MS);
}

export function isScheduledDeletionDue(scheduledAt: Date, now: Date = new Date()): boolean {
  return scheduledAt.getTime() <= now.getTime();
}

export function shouldCancelScheduledDeletion(
  scheduledAt: Date | null,
  deactivatedAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (deactivatedAt) {
    return false;
  }
  if (!scheduledAt) {
    return false;
  }
  return scheduledAt.getTime() > now.getTime();
}

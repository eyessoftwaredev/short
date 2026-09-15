import { headers } from "next/headers";
import { auditLogs, getDb } from "@short/db";

export type AuditEntry = {
  workspaceId: string | null;
  actorId: string | null;
  impersonatorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Appends to the audit trail. Never throws: a failed audit write must not roll back the
 * business operation that already succeeded.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    const headerList = await headers();
    const ip =
      headerList.get("cf-connecting-ip") ??
      headerList.get("x-real-ip") ??
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;

    await getDb()
      .insert(auditLogs)
      .values({
        workspaceId: entry.workspaceId,
        actorId: entry.actorId,
        impersonatorId: entry.impersonatorId ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        metadata: entry.metadata ?? {},
        ipAddress: ip,
      });
  } catch (error) {
    console.error("recordAudit failed", error);
  }
}

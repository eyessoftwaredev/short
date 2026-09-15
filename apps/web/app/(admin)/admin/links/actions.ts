"use server";

import { revalidatePath } from "next/cache";
import { domains, eq, getDb, links } from "@short/db";
import { ok, toActionError, type ActionResult } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { deleteLinkRecord } from "@/lib/kv";
import { requireSuperadmin } from "@/lib/session";
import { syncLinkToKv } from "@/lib/links";

async function hostnameFor(linkId: string): Promise<{ hostname: string; slug: string } | null> {
  const [row] = await getDb()
    .select({ hostname: domains.hostname, slug: links.slug })
    .from(links)
    .innerJoin(domains, eq(links.domainId, domains.id))
    .where(eq(links.id, linkId))
    .limit(1);
  return row ?? null;
}

/**
 * Flagging disables the link at the edge as well as in Postgres: the KV record is
 * removed so the worker stops redirecting immediately instead of on the next TTL.
 */
export async function flagLinkAction(
  linkId: string,
  reason: string,
): Promise<ActionResult<null>> {
  try {
    const context = await requireSuperadmin();
    const target = await hostnameFor(linkId);

    const now = new Date();
    await getDb()
      .update(links)
      .set({
        abuseFlaggedAt: now,
        abuseReason: reason.trim() === "" ? "Abuse report" : reason.trim(),
        disabledAt: now,
        updatedAt: now,
      })
      .where(eq(links.id, linkId));

    if (target) {
      await deleteLinkRecord(target.hostname, target.slug);
    }

    await recordAudit({
      workspaceId: null,
      actorId: context.user.id,
      action: "admin.link.flagged",
      targetType: "link",
      targetId: linkId,
      metadata: { reason },
    });

    revalidatePath("/admin/links");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function clearLinkFlagAction(linkId: string): Promise<ActionResult<null>> {
  try {
    const context = await requireSuperadmin();

    await getDb()
      .update(links)
      .set({
        abuseFlaggedAt: null,
        abuseReason: null,
        disabledAt: null,
        updatedAt: new Date(),
      })
      .where(eq(links.id, linkId));

    await syncLinkToKv(linkId);

    await recordAudit({
      workspaceId: null,
      actorId: context.user.id,
      action: "admin.link.restored",
      targetType: "link",
      targetId: linkId,
    });

    revalidatePath("/admin/links");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

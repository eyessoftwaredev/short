"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, fromZodError, ok, QuotaError, toActionError, type ActionResult } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { canWriteWorkspace, requireWorkspace } from "@/lib/session";
import {
  createStatsShare,
  listStatsShares,
  revokeStatsShare,
  statsShareInputSchema,
  type StatsShareInput,
  type StatsShareView,
} from "@/lib/stats-shares";

const idSchema = z.string().uuid();

/**
 * Creates a public, read-only stats page for one link (`view.url`).
 * Errors: `validation`, `not_found`, `share_limit` (20 live shares per link), `forbidden`.
 */
export async function createStatsShareAction(
  linkId: string,
  values: StatsShareInput,
): Promise<ActionResult<StatsShareView>> {
  try {
    const context = await requireWorkspace();
    if (!canWriteWorkspace(context)) {
      return fail("forbidden");
    }
    if (!idSchema.safeParse(linkId).success) {
      return fail("validation");
    }
    const parsed = statsShareInputSchema.safeParse(values ?? {});
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    let share: StatsShareView;
    try {
      share = await createStatsShare(context.workspace.id, linkId, context.user.id, parsed.data);
    } catch (error) {
      if (error instanceof Error && error.message === "Link not found") {
        return fail("not_found");
      }
      if (error instanceof QuotaError && error.resource === "stats_shares") {
        return fail("share_limit");
      }
      throw error;
    }

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "stats_share.created",
      targetType: "link",
      targetId: linkId,
      metadata: {
        shareId: share.id,
        expiresAt: share.expiresAt,
        showReferrers: share.showReferrers,
        showLocations: share.showLocations,
      },
    });

    revalidatePath(`/links/${linkId}/stats`);
    return ok(share);
  } catch (error) {
    return toActionError(error);
  }
}

/** Every share of a link (newest first, revoked and expired included, `active` flags live ones). */
export async function listStatsSharesAction(linkId: string): Promise<ActionResult<StatsShareView[]>> {
  try {
    const context = await requireWorkspace();
    if (!idSchema.safeParse(linkId).success) {
      return fail("validation");
    }
    return ok(await listStatsShares(context.workspace.id, linkId));
  } catch (error) {
    return toActionError(error);
  }
}

/** Takes the public page down immediately. Errors: `validation`, `not_found`, `forbidden`. */
export async function revokeStatsShareAction(shareId: string): Promise<ActionResult<StatsShareView>> {
  try {
    const context = await requireWorkspace();
    if (!canWriteWorkspace(context)) {
      return fail("forbidden");
    }
    if (!idSchema.safeParse(shareId).success) {
      return fail("validation");
    }
    const share = await revokeStatsShare(context.workspace.id, shareId);
    if (!share) {
      return fail("not_found");
    }

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "stats_share.revoked",
      targetType: "link",
      targetId: share.linkId,
      metadata: { shareId: share.id },
    });

    revalidatePath(`/links/${share.linkId}/stats`);
    return ok(share);
  } catch (error) {
    return toActionError(error);
  }
}

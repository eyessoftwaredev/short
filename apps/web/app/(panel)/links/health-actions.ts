"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, toActionError, type ActionResult } from "@/lib/action-result";
import {
  listBrokenLinks,
  recheckLinkHealth,
  type BrokenLinkView,
  type LinkHealthView,
} from "@/lib/link-health";
import { rateLimit } from "@/lib/redis";
import { canWriteWorkspace, requireWorkspace } from "@/lib/session";

/** Manual checks hit third-party sites from our servers; keep them occasional. */
const RECHECKS_PER_USER_PER_MINUTE = 10;
const RECHECK_LINK_COOLDOWN_SECONDS = 30;

/** Broken links of the active workspace, most recently broken first (max 200). */
export async function listBrokenLinksAction(): Promise<ActionResult<BrokenLinkView[]>> {
  try {
    const context = await requireWorkspace();
    return ok(await listBrokenLinks(context.workspace.id));
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Probes a link's destination now and stores the verdict (same two-strike rule as the
 * monitor; a broken link recovers on the first good answer).
 * Errors: `validation`, `not_found`, `rate_limited`, `forbidden`.
 */
export async function recheckLinkHealthAction(linkId: string): Promise<ActionResult<LinkHealthView>> {
  try {
    const context = await requireWorkspace();
    if (!canWriteWorkspace(context)) {
      return fail("forbidden");
    }
    if (!z.string().uuid().safeParse(linkId).success) {
      return fail("validation");
    }

    const [perUser, perLink] = await Promise.all([
      rateLimit(`health-recheck:user:${context.user.id}`, RECHECKS_PER_USER_PER_MINUTE, 60),
      rateLimit(`health-recheck:link:${linkId}`, 1, RECHECK_LINK_COOLDOWN_SECONDS),
    ]);
    if (!perUser.allowed || !perLink.allowed) {
      return fail("rate_limited");
    }

    const result = await recheckLinkHealth(context.workspace.id, linkId);
    if (!result) {
      return fail("not_found");
    }
    revalidatePath("/links");
    revalidatePath(`/links/${linkId}`);
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}

"use server";

import { eq, getDb, user } from "@short/db";
import { fail, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { getPublicInvite, isInviteUsable } from "@/lib/team";

/**
 * The invite email is the proof of inbox ownership. Mark that address verified so
 * the person who opened the mail never has to click a second link.
 */
export async function verifyEmailFromInviteAction(inviteId: string): Promise<ActionResult<null>> {
  try {
    const invite = await getPublicInvite(inviteId);
    if (!invite || !isInviteUsable(invite)) {
      return fail("invite_invalid");
    }

    await getDb()
      .update(user)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(user.email, invite.email.trim().toLowerCase()));

    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

"use server";

import { and, eq, getDb, user } from "@short/db";
import { headers } from "next/headers";
import { fail, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { auth } from "@/lib/auth";
import { isValidInviteProof } from "@/lib/secret";
import { getPublicInvite, isInviteUsable } from "@/lib/team";

function isEmailNotVerified(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const record = error as { body?: { code?: string } };
  return record.body?.code === "EMAIL_NOT_VERIFIED";
}

/**
 * The invite email is the proof of inbox ownership, so the person who opened it never
 * has to click a second link. Both halves are checked here: `proof` only travels in the
 * email (the inviter knows the invitation id but not the proof), and the password must
 * belong to the account — otherwise someone who pre-registered the address with their
 * own password would get it verified the moment the real owner followed the invite.
 */
export async function verifyEmailFromInviteAction(
  inviteId: string,
  proof: string,
  password: string,
): Promise<ActionResult<null>> {
  try {
    if (typeof inviteId !== "string" || typeof proof !== "string" || typeof password !== "string") {
      return fail("invite_invalid");
    }
    const invite = await getPublicInvite(inviteId);
    if (!invite || !isInviteUsable(invite) || !isValidInviteProof(invite.id, invite.email, proof)) {
      return fail("invite_invalid");
    }

    const email = invite.email.trim().toLowerCase();
    const [account] = await getDb()
      .select({ id: user.id, emailVerified: user.emailVerified })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    if (!account || account.emailVerified) {
      return ok(null);
    }

    // Better Auth checks the password before the verification flag, so a correct
    // password on an unverified account surfaces as EMAIL_NOT_VERIFIED.
    try {
      await auth.api.signInEmail({ headers: await headers(), body: { email, password } });
      return ok(null);
    } catch (error) {
      if (!isEmailNotVerified(error)) {
        return fail("wrong_password");
      }
    }

    await getDb()
      .update(user)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(and(eq(user.id, account.id), eq(user.emailVerified, false)));

    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

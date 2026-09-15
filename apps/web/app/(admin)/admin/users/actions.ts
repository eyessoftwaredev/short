"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq, getDb, user } from "@short/db";
import { auth, SUPERADMIN_ROLE } from "@/lib/auth";
import { fail, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { requireSuperadmin } from "@/lib/session";

async function forwardedHeaders(): Promise<Headers> {
  return new Headers(await headers());
}

export async function banUserAction(
  userId: string,
  reason: string,
): Promise<ActionResult<null>> {
  try {
    const context = await requireSuperadmin();
    if (userId === context.user.id) {
      return fail("You cannot ban your own account.");
    }

    await auth.api.banUser({
      body: { userId, banReason: reason.trim() === "" ? "Policy violation" : reason.trim() },
      headers: await forwardedHeaders(),
    });

    await recordAudit({
      workspaceId: null,
      actorId: context.user.id,
      action: "admin.user.banned",
      targetType: "user",
      targetId: userId,
      metadata: { reason },
    });

    revalidatePath("/admin/users");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function unbanUserAction(userId: string): Promise<ActionResult<null>> {
  try {
    const context = await requireSuperadmin();

    await auth.api.unbanUser({ body: { userId }, headers: await forwardedHeaders() });

    await recordAudit({
      workspaceId: null,
      actorId: context.user.id,
      action: "admin.user.unbanned",
      targetType: "user",
      targetId: userId,
    });

    revalidatePath("/admin/users");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Impersonation swaps the caller's session for the target user's. The audit entry is
 * written before the swap so it is attributed to the real superadmin.
 */
export async function impersonateUserAction(userId: string): Promise<ActionResult<null>> {
  try {
    const context = await requireSuperadmin();
    if (userId === context.user.id) {
      return fail("You are already signed in as this user.");
    }

    await recordAudit({
      workspaceId: null,
      actorId: context.user.id,
      action: "admin.user.impersonated",
      targetType: "user",
      targetId: userId,
    });

    await auth.api.impersonateUser({ body: { userId }, headers: await forwardedHeaders() });
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function stopImpersonatingAction(): Promise<ActionResult<null>> {
  try {
    await auth.api.stopImpersonating({ headers: await forwardedHeaders() });
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function setSuperadminAction(
  userId: string,
  enabled: boolean,
): Promise<ActionResult<null>> {
  try {
    const context = await requireSuperadmin();
    if (userId === context.user.id && !enabled) {
      return fail("You cannot remove your own platform access.");
    }

    await getDb()
      .update(user)
      .set({ role: enabled ? SUPERADMIN_ROLE : "user", updatedAt: new Date() })
      .where(eq(user.id, userId));

    await recordAudit({
      workspaceId: null,
      actorId: context.user.id,
      action: enabled ? "admin.user.promoted" : "admin.user.demoted",
      targetType: "user",
      targetId: userId,
    });

    revalidatePath("/admin/users");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

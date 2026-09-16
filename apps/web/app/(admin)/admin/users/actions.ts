"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { PLAN_KEYS, type PlanKey } from "@short/core";
import { and, eq, getDb, ne, user } from "@short/db";
import { auth, SUPERADMIN_ROLE } from "@/lib/auth";
import { fail, fromZodError, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { assignWorkspacePlan, grantInfinityToUser } from "@/lib/billing";
import { requireSuperadmin } from "@/lib/session";

function refreshUser(userId: string): void {
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

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
      return fail("self_ban");
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

    refreshUser(userId);
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

    refreshUser(userId);
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
      return fail("already_impersonating");
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
      return fail("self_demote");
    }

    await getDb()
      .update(user)
      .set({ role: enabled ? SUPERADMIN_ROLE : "user", updatedAt: new Date() })
      .where(eq(user.id, userId));

    if (enabled) {
      await grantInfinityToUser(userId);
    }

    await recordAudit({
      workspaceId: null,
      actorId: context.user.id,
      action: enabled ? "admin.user.promoted" : "admin.user.demoted",
      targetType: "user",
      targetId: userId,
    });

    refreshUser(userId);
    revalidatePath("/admin/workspaces");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

const userUpdateSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  emailVerified: z.boolean(),
  role: z.enum(["user", SUPERADMIN_ROLE]),
  banned: z.boolean(),
  banReason: z.string().trim().max(240),
});

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export async function updateUserAction(values: UserUpdateInput): Promise<ActionResult<null>> {
  try {
    const context = await requireSuperadmin();
    const parsed = userUpdateSchema.safeParse(values);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    const input = parsed.data;
    const email = input.email.toLowerCase();
    const isSelf = input.userId === context.user.id;

    if (isSelf && input.banned) {
      return fail("self_ban");
    }
    if (isSelf && input.role !== SUPERADMIN_ROLE) {
      return fail("self_demote");
    }

    const [existing] = await getDb()
      .select({
        id: user.id,
        email: user.email,
        role: user.role,
        banned: user.banned,
      })
      .from(user)
      .where(eq(user.id, input.userId))
      .limit(1);
    if (!existing) {
      return fail("member_missing");
    }

    const [taken] = await getDb()
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.email, email), ne(user.id, input.userId)))
      .limit(1);
    if (taken) {
      return fail("email_taken");
    }

    await getDb()
      .update(user)
      .set({
        name: input.name,
        email,
        emailVerified: input.emailVerified,
        role: input.role,
        updatedAt: new Date(),
      })
      .where(eq(user.id, input.userId));

    if (input.banned && !existing.banned) {
      await auth.api.banUser({
        body: {
          userId: input.userId,
          banReason: input.banReason === "" ? "Policy violation" : input.banReason,
        },
        headers: await forwardedHeaders(),
      });
    } else if (!input.banned && existing.banned) {
      await auth.api.unbanUser({
        body: { userId: input.userId },
        headers: await forwardedHeaders(),
      });
    } else if (input.banned && input.banReason !== "") {
      await getDb()
        .update(user)
        .set({ banReason: input.banReason, updatedAt: new Date() })
        .where(eq(user.id, input.userId));
    }

    if (input.role === SUPERADMIN_ROLE && existing.role !== SUPERADMIN_ROLE) {
      await grantInfinityToUser(input.userId);
    }

    await recordAudit({
      workspaceId: null,
      actorId: context.user.id,
      action: "admin.user.updated",
      targetType: "user",
      targetId: input.userId,
      metadata: { email, role: input.role, banned: input.banned },
    });

    refreshUser(input.userId);
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function setWorkspacePlanAction(
  userId: string,
  workspaceId: string,
  planKey: string,
): Promise<ActionResult<null>> {
  try {
    const context = await requireSuperadmin();
    if (!PLAN_KEYS.includes(planKey as PlanKey)) {
      return fail("validation");
    }

    const assigned = await assignWorkspacePlan(workspaceId, planKey as PlanKey);
    if (!assigned) {
      return fail("plan_missing");
    }

    await recordAudit({
      workspaceId,
      actorId: context.user.id,
      action: "admin.workspace.plan",
      targetType: "workspace",
      targetId: workspaceId,
      metadata: { planKey, userId },
    });

    refreshUser(userId);
    revalidatePath("/admin/workspaces");
    revalidatePath("/billing");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

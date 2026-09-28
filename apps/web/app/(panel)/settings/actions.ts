"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { webhookInputSchema } from "@short/core";
import {
  account,
  and,
  apikey,
  eq,
  getDb,
  invitation,
  member,
  organization,
  user,
  webhooks,
} from "@short/db";
import { fail, fromZodError, ok, toActionError, type ActionResult } from "@/lib/action-result";
import {
  cancelScheduledDeletion,
  listSoleOwnedTeamNames,
  scheduleAccountDeletion,
} from "@/lib/account-deletion";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertFeature, assertOwnerQuota, assertQuota } from "@/lib/quota";
import { getSessionContext, requireSession, requireWorkspace, requireWorkspaceRole } from "@/lib/session";
import { purgeWorkspaceEdgeRecords } from "@/lib/domains";
import { createWorkspace, getPersonalWorkspaceId } from "@/lib/workspace";
import {
  assertPublicWebhookUrl,
  generateWebhookSecret,
  invalidateRelaySubscribers,
  listWebhookDeliveries,
  replayWebhookDelivery,
  sealWebhookSecret,
  testWebhook,
  WebhookUrlError,
} from "@/lib/webhooks";

const WORKSPACE_ROLES = ["owner", "admin", "member"] as const;

/** Surfaces the SSRF guard as a form error instead of a generic failure. */
async function isPublicWebhookUrl(raw: string): Promise<boolean> {
  try {
    await assertPublicWebhookUrl(raw);
    return true;
  } catch (error) {
    if (error instanceof WebhookUrlError) {
      return false;
    }
    throw error;
  }
}

export async function updateProfileAction(name: string): Promise<ActionResult<null>> {
  try {
    const context = await requireWorkspace();
    const parsed = z.string().trim().min(2).max(80).safeParse(name);
    if (!parsed.success) {
      return fail("name_length");
    }

    await getDb()
      .update(user)
      .set({ name: parsed.data, updatedAt: new Date() })
      .where(eq(user.id, context.user.id));

    revalidatePath("/settings");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateWorkspaceAction(name: string): Promise<ActionResult<null>> {
  try {
    const context = await requireWorkspaceRole("admin");
    const parsed = z.string().trim().min(2).max(80).safeParse(name);
    if (!parsed.success) {
      return fail("name_length");
    }

    await getDb()
      .update(organization)
      .set({ name: parsed.data })
      .where(eq(organization.id, context.workspace.id));

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "workspace.updated",
      targetType: "workspace",
      targetId: context.workspace.id,
      metadata: { name: parsed.data },
    });

    revalidatePath("/settings");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function inviteMemberAction(
  email: string,
  role: string,
): Promise<ActionResult<null>> {
  try {
    const context = await requireWorkspaceRole("admin");
    const parsed = z
      .object({ email: z.string().trim().toLowerCase().email(), role: z.enum(WORKSPACE_ROLES) })
      .safeParse({ email, role });
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    const db = getDb();
    const [existing] = await db
      .select({ id: member.id })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(and(eq(member.organizationId, context.workspace.id), eq(user.email, parsed.data.email)))
      .limit(1);

    if (existing) {
      return fail("already_member");
    }
    if (context.workspace.kind !== "team") {
      return fail("invite_personal");
    }
    // Admins can invite admins and members; only an owner can hand out ownership.
    if (parsed.data.role === "owner" && context.role !== "owner") {
      return fail("invalid_role");
    }

    await assertQuota(context.workspace.id, context.plan, "members");

    await auth.api.createInvitation({
      body: {
        email: parsed.data.email,
        role: parsed.data.role,
        organizationId: context.workspace.id,
      },
      headers: await headers(),
    });

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "member.invited",
      targetType: "invitation",
      metadata: { email: parsed.data.email, role: parsed.data.role },
    });

    revalidatePath("/settings");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function cancelInviteAction(invitationId: string): Promise<ActionResult<null>> {
  try {
    const context = await requireWorkspaceRole("admin");

    await getDb()
      .update(invitation)
      .set({ status: "canceled" })
      .where(
        and(eq(invitation.id, invitationId), eq(invitation.organizationId, context.workspace.id)),
      );

    revalidatePath("/settings");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateMemberRoleAction(
  memberId: string,
  role: string,
): Promise<ActionResult<null>> {
  try {
    const context = await requireWorkspaceRole("owner");
    const parsed = z.enum(WORKSPACE_ROLES).safeParse(role);
    if (!parsed.success) {
      return fail("invalid_role");
    }

    const db = getDb();
    const [target] = await db
      .select({ userId: member.userId, role: member.role })
      .from(member)
      .where(and(eq(member.id, memberId), eq(member.organizationId, context.workspace.id)))
      .limit(1);

    if (!target) {
      return fail("member_missing");
    }

    // Demoting the last owner would leave the workspace without anyone who can manage
    // billing or invite people.
    if (target.role === "owner" && parsed.data !== "owner") {
      const owners = await db
        .select({ id: member.id })
        .from(member)
        .where(and(eq(member.organizationId, context.workspace.id), eq(member.role, "owner")));

      if (owners.length <= 1) {
        return fail("last_owner");
      }
    }

    await db
      .update(member)
      .set({ role: parsed.data })
      .where(and(eq(member.id, memberId), eq(member.organizationId, context.workspace.id)));

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "member.role_changed",
      targetType: "member",
      targetId: memberId,
      metadata: { role: parsed.data },
    });

    revalidatePath("/settings");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeMemberAction(memberId: string): Promise<ActionResult<null>> {
  try {
    const context = await requireWorkspaceRole("admin");
    const db = getDb();

    const [target] = await db
      .select({ userId: member.userId, role: member.role })
      .from(member)
      .where(and(eq(member.id, memberId), eq(member.organizationId, context.workspace.id)))
      .limit(1);

    if (!target) {
      return fail("member_missing");
    }
    if (target.role === "owner") {
      return fail("owner_remove");
    }
    // Admins manage members; removing a fellow admin is an owner decision.
    if (target.role === "admin" && context.role !== "owner" && !context.isSuperadmin) {
      return fail("invalid_role");
    }

    await db
      .delete(member)
      .where(and(eq(member.id, memberId), eq(member.organizationId, context.workspace.id)));

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "member.removed",
      targetType: "member",
      targetId: memberId,
    });

    revalidatePath("/settings");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

/** The plaintext key is returned once; only its hash is stored. */
export async function createApiKeyAction(name: string): Promise<ActionResult<{ key: string }>> {
  try {
    const context = await requireWorkspaceRole("admin");
    assertFeature(context.plan, "apiAccess");

    const parsed = z.string().trim().min(1).max(32).safeParse(name);
    if (!parsed.success) {
      return fail("key_name");
    }

    const created = await auth.api.createApiKey({
      body: {
        name: parsed.data,
        organizationId: context.workspace.id,
        prefix: "short_",
        metadata: { workspaceId: context.workspace.id },
      },
      headers: await headers(),
    });

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "apikey.created",
      targetType: "apikey",
      targetId: created.id,
      metadata: { name: parsed.data },
    });

    revalidatePath("/settings");
    return ok({ key: created.key });
  } catch (error) {
    return toActionError(error);
  }
}

export async function revokeApiKeyAction(keyId: string): Promise<ActionResult<null>> {
  try {
    const context = await requireWorkspaceRole("admin");

    // Deleting through the plugin would require the creator's session, so the row is
    // removed directly after confirming it belongs to this workspace.
    const deleted = await getDb()
      .delete(apikey)
      .where(and(eq(apikey.id, keyId), eq(apikey.referenceId, context.workspace.id)))
      .returning({ id: apikey.id });

    if (deleted.length === 0) {
      return fail("key_missing");
    }

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "apikey.revoked",
      targetType: "apikey",
      targetId: keyId,
    });

    revalidatePath("/settings");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function createWebhookAction(
  values: unknown,
): Promise<ActionResult<{ id: string; secret: string }>> {
  try {
    const context = await requireWorkspaceRole("admin");
    assertFeature(context.plan, "webhooks");

    const parsed = webhookInputSchema.safeParse(values);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }
    if (!(await isPublicWebhookUrl(parsed.data.url))) {
      return fail("validation", { url: ["webhookUrlPrivate"] });
    }

    const secret = generateWebhookSecret();
    const [created] = await getDb()
      .insert(webhooks)
      .values({
        workspaceId: context.workspace.id,
        url: parsed.data.url,
        events: parsed.data.events,
        enabled: parsed.data.enabled,
        // Stored sealed; the plaintext is returned to the caller exactly once below.
        secret: sealWebhookSecret(secret),
      })
      .returning({ id: webhooks.id });

    if (!created) {
      return fail("webhook_save");
    }

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "webhook.created",
      targetType: "webhook",
      targetId: created.id,
      metadata: { url: parsed.data.url, events: parsed.data.events },
    });

    await invalidateRelaySubscribers();
    revalidatePath("/settings");
    return ok({ id: created.id, secret });
  } catch (error) {
    return toActionError(error);
  }
}

export async function toggleWebhookAction(
  webhookId: string,
  enabled: boolean,
): Promise<ActionResult<null>> {
  try {
    const context = await requireWorkspaceRole("admin");

    await getDb()
      .update(webhooks)
      .set({ enabled })
      .where(and(eq(webhooks.id, webhookId), eq(webhooks.workspaceId, context.workspace.id)));

    await invalidateRelaySubscribers();
    revalidatePath("/settings");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteWebhookAction(webhookId: string): Promise<ActionResult<null>> {
  try {
    const context = await requireWorkspaceRole("admin");

    await getDb()
      .delete(webhooks)
      .where(and(eq(webhooks.id, webhookId), eq(webhooks.workspaceId, context.workspace.id)));

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "webhook.deleted",
      targetType: "webhook",
      targetId: webhookId,
    });

    await invalidateRelaySubscribers();
    revalidatePath("/settings");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

/** What the endpoint answered to the last attempt, so the panel can say "it worked" or why not. */
export type WebhookAttemptResult = { status: number | null; error: string | null };

async function lastAttempt(webhookId: string): Promise<WebhookAttemptResult> {
  const [latest] = await listWebhookDeliveries(webhookId, 1);
  return { status: latest?.responseStatus ?? null, error: latest?.error ?? null };
}

export async function testWebhookAction(webhookId: string): Promise<ActionResult<WebhookAttemptResult>> {
  try {
    const context = await requireWorkspaceRole("admin");
    const [row] = await getDb()
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, webhookId), eq(webhooks.workspaceId, context.workspace.id)))
      .limit(1);
    if (!row) {
      return fail("webhook_missing");
    }
    // Rows saved before the create-time check (or re-pointed DNS) are re-checked here.
    if (!(await isPublicWebhookUrl(row.url))) {
      return fail("validation", { url: ["webhookUrlPrivate"] });
    }
    await testWebhook(row);
    revalidatePath("/settings");
    return ok(await lastAttempt(row.id));
  } catch (error) {
    return toActionError(error);
  }
}

export async function replayWebhookAction(webhookId: string): Promise<ActionResult<WebhookAttemptResult>> {
  try {
    const context = await requireWorkspaceRole("admin");
    const [row] = await getDb()
      .select({ id: webhooks.id, url: webhooks.url })
      .from(webhooks)
      .where(and(eq(webhooks.id, webhookId), eq(webhooks.workspaceId, context.workspace.id)))
      .limit(1);
    if (!row) {
      return fail("webhook_missing");
    }
    if (!(await isPublicWebhookUrl(row.url))) {
      return fail("validation", { url: ["webhookUrlPrivate"] });
    }
    // Replaying with no delivery on record used to surface as a generic failure.
    const [previous] = await listWebhookDeliveries(webhookId, 1);
    if (!previous) {
      return fail("not_found");
    }
    await replayWebhookDelivery(webhookId);
    revalidatePath("/settings");
    return ok(await lastAttempt(row.id));
  } catch (error) {
    return toActionError(error);
  }
}

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
): Promise<ActionResult<null>> {
  try {
    await requireSession();
    await auth.api.changePassword({
      headers: await headers(),
      body: { currentPassword, newPassword },
    });
    revalidatePath("/settings");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function changeEmailAction(newEmail: string): Promise<ActionResult<null>> {
  try {
    await requireSession();
    const parsed = z.string().trim().email().safeParse(newEmail);
    if (!parsed.success) {
      return fail("email_invalid");
    }
    await auth.api.changeEmail({
      headers: await headers(),
      body: { newEmail: parsed.data },
    });
    revalidatePath("/settings");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function persistThemeAction(theme: "light" | "dark"): Promise<ActionResult<null>> {
  try {
    const context = await getSessionContext();
    if (!context) {
      return ok(null);
    }
    await getDb()
      .update(user)
      .set({ theme, updatedAt: new Date() })
      .where(eq(user.id, context.user.id));
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function createTeamAction(
  name: string,
): Promise<ActionResult<{ workspaceId: string }>> {
  try {
    const context = await requireSession();
    const parsed = z.string().trim().min(2).max(80).safeParse(name);
    if (!parsed.success) {
      return fail("name_length");
    }

    await assertOwnerQuota(context.user.id, context.accountPlan, "teams");
    const workspace = await createWorkspace(context.user.id, parsed.data, "Team", "team");

    await auth.api.setActiveOrganization({
      headers: await headers(),
      body: { organizationId: workspace.id },
    });

    await recordAudit({
      workspaceId: workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "team.created",
      targetType: "workspace",
      targetId: workspace.id,
      metadata: { name: workspace.name },
    });

    revalidatePath("/dashboard");
    revalidatePath("/settings");
    return ok({ workspaceId: workspace.id });
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteTeamAction(): Promise<ActionResult<{ workspaceId: string | null }>> {
  try {
    const context = await requireWorkspaceRole("owner");
    if (context.workspace.kind !== "team") {
      return fail("delete_personal");
    }

    const workspaceId = context.workspace.id;
    const personalId = await getPersonalWorkspaceId(context.user.id);

    // The organization cascade only reaches Postgres. Cloudflare hostnames and KV records
    // would keep serving the team's links, and API keys have no FK to the workspace.
    await purgeWorkspaceEdgeRecords(workspaceId);
    await getDb().delete(apikey).where(eq(apikey.referenceId, workspaceId));
    await getDb().delete(organization).where(eq(organization.id, workspaceId));
    await invalidateRelaySubscribers();

    if (personalId) {
      await auth.api.setActiveOrganization({
        headers: await headers(),
        body: { organizationId: personalId },
      });
    }

    await recordAudit({
      workspaceId: personalId,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "team.deleted",
      targetType: "workspace",
      targetId: workspaceId,
      metadata: { name: context.workspace.name },
    });

    revalidatePath("/dashboard");
    revalidatePath("/settings");
    return ok({ workspaceId: personalId });
  } catch (error) {
    return toActionError(error);
  }
}

async function verifyCurrentPassword(userId: string, password: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ hash: account.password })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .limit(1);
  if (!row?.hash) {
    return false;
  }
  const ctx = await auth.$context;
  return ctx.password.verify({ password, hash: row.hash });
}

export async function scheduleAccountDeletionAction(password: string): Promise<ActionResult<null>> {
  try {
    const context = await requireSession();
    const parsed = z.string().min(1).safeParse(password);
    if (!parsed.success) {
      return fail("wrong_password");
    }
    if (!(await verifyCurrentPassword(context.user.id, parsed.data))) {
      return fail("wrong_password");
    }

    const soleTeams = await listSoleOwnedTeamNames(context.user.id);
    if (soleTeams.length > 0) {
      return fail("last_owned_teams");
    }

    await scheduleAccountDeletion(context.user.id);
    await recordAudit({
      workspaceId: context.workspace?.id ?? null,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "account.deletion_scheduled",
      targetType: "user",
      targetId: context.user.id,
    });
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function cancelScheduledDeletionAction(): Promise<ActionResult<{ restored: boolean }>> {
  try {
    const context = await requireSession();
    const restored = await cancelScheduledDeletion(context.user.id);
    if (restored) {
      await recordAudit({
        workspaceId: context.workspace?.id ?? null,
        actorId: context.user.id,
        impersonatorId: context.impersonatedBy,
        action: "account.deletion_cancelled",
        targetType: "user",
        targetId: context.user.id,
      });
    }
    return ok({ restored });
  } catch (error) {
    return toActionError(error);
  }
}

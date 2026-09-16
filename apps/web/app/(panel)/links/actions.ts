"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { serializeLink } from "@/lib/api-serializers";
import { recordAudit } from "@/lib/audit";
import { incrementLinksCreated } from "@/lib/billing";
import { fail, ok, toActionError, type ActionResult } from "@/lib/action-result";
import {
  applyDestinationRewrite,
  DestinationRewriteError,
  previewDestinationRewrite,
  type DestinationRewritePreview,
  type DestinationRewriteResult,
} from "@/lib/bulk-destinations";
import { linkFormSchema, toLinkInput, type LinkFormValues } from "@/lib/link-form";
import {
  createLink,
  deleteLink,
  getLink,
  setLinkArchived,
  shortUrl,
  updateLink,
} from "@/lib/links";
import { assertFeature, assertQuota, assertSlugLength } from "@/lib/quota";
import { requireWorkspace, requireWorkspaceRole } from "@/lib/session";
import { dispatchWebhook } from "@/lib/webhooks";

export type SavedLink = { id: string; shortUrl: string };

export async function createLinkAction(values: LinkFormValues): Promise<ActionResult<SavedLink>> {
  try {
    const context = await requireWorkspace();
    const parsed = linkFormSchema.safeParse(values);
    if (!parsed.success) {
      return toActionError(parsed.error);
    }

    const input = toLinkInput(parsed.data);

    await assertQuota(context.workspace.id, context.plan, "links");
    if (input.rules.length > 0) {
      assertFeature(context.plan, "targeting");
    }
    if (input.abVariants.length > 0) {
      assertFeature(context.plan, "abTesting");
    }
    if (input.password) {
      assertFeature(context.plan, "passwordProtection");
    }
    if (input.cloaked) {
      assertFeature(context.plan, "cloaking");
    }
    assertSlugLength({
      slug: input.slug,
      plan: context.plan,
      isSuperadmin: context.isSuperadmin,
    });

    const link = await createLink({
      workspaceId: context.workspace.id,
      creatorId: context.user.id,
      input,
    });

    await incrementLinksCreated(context.workspace.id);

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "link.created",
      targetType: "link",
      targetId: link.id,
      metadata: { slug: link.slug, hostname: link.hostname },
    });

    after(() => dispatchWebhook(context.workspace.id, "link.created", serializeLink(link)));

    revalidatePath("/links");
    revalidatePath("/dashboard");

    return ok({ id: link.id, shortUrl: shortUrl(link.hostname, link.slug) });
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateLinkAction(
  linkId: string,
  values: LinkFormValues,
): Promise<ActionResult<SavedLink>> {
  try {
    const context = await requireWorkspace();
    const parsed = linkFormSchema.safeParse(values);
    if (!parsed.success) {
      return toActionError(parsed.error);
    }

    const input = toLinkInput(parsed.data);

    if (input.rules.length > 0) {
      assertFeature(context.plan, "targeting");
    }
    if (input.abVariants.length > 0) {
      assertFeature(context.plan, "abTesting");
    }
    if (input.cloaked) {
      assertFeature(context.plan, "cloaking");
    }

    const existing = await getLink(context.workspace.id, linkId);
    assertSlugLength({
      slug: input.slug,
      plan: context.plan,
      isSuperadmin: context.isSuperadmin,
      previous: existing?.slug,
    });

    const link = await updateLink({ workspaceId: context.workspace.id, linkId, input });

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "link.updated",
      targetType: "link",
      targetId: link.id,
      metadata: { slug: link.slug },
    });

    after(() => dispatchWebhook(context.workspace.id, "link.updated", serializeLink(link)));

    revalidatePath("/links");
    revalidatePath(`/links/${linkId}`);

    return ok({ id: link.id, shortUrl: shortUrl(link.hostname, link.slug) });
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteLinkAction(linkId: string): Promise<ActionResult> {
  try {
    const context = await requireWorkspace();
    if (context.role === "member") {
      return fail("delete_forbidden");
    }

    await deleteLink(context.workspace.id, linkId);
    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "link.deleted",
      targetType: "link",
      targetId: linkId,
    });

    after(() => dispatchWebhook(context.workspace.id, "link.deleted", { id: linkId }));

    revalidatePath("/links");
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

export async function archiveLinkAction(
  linkId: string,
  archived: boolean,
): Promise<ActionResult> {
  try {
    const context = await requireWorkspace();
    await setLinkArchived(context.workspace.id, linkId, archived);
    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: archived ? "link.archived" : "link.restored",
      targetType: "link",
      targetId: linkId,
    });

    revalidatePath("/links");
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

function fromRewriteError(error: unknown): ActionResult<never> {
  if (error instanceof DestinationRewriteError) {
    if (error.code === "invalid_host") {
      return fail("domain_invalid");
    }
    if (error.code === "same_host") {
      return fail("rewrite_same");
    }
    return fail("rewrite_too_many");
  }
  return toActionError(error);
}

export async function previewDestinationRewriteAction(
  from: string,
  to: string,
): Promise<ActionResult<DestinationRewritePreview>> {
  try {
    const context = await requireWorkspaceRole("admin");
    return ok(await previewDestinationRewrite(context.workspace.id, from, to));
  } catch (error) {
    return fromRewriteError(error);
  }
}

export async function applyDestinationRewriteAction(
  from: string,
  to: string,
): Promise<ActionResult<DestinationRewriteResult>> {
  try {
    const context = await requireWorkspaceRole("admin");
    const result = await applyDestinationRewrite(context.workspace.id, from, to);

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "link.destinations.rewritten",
      targetType: "workspace",
      targetId: context.workspace.id,
      metadata: {
        from: result.from,
        to: result.to,
        links: result.links,
        domains: result.domains,
        fields: result.fields,
      },
    });

    revalidatePath("/links");
    revalidatePath("/domains");
    return ok(result);
  } catch (error) {
    return fromRewriteError(error);
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { createBiopage, deleteBiopage, getBiopage, handleTaken, updateBiopage } from "@/lib/biopages";
import { toBiopageInput, type BioFormValues } from "@/lib/bio-form";
import { assertOwnedMedia } from "@/lib/media";
import { assertFeature, assertQuota, assertSlugLength } from "@/lib/quota";
import { requireWorkspace } from "@/lib/session";

export type SavedBiopage = { id: string; handle: string };

async function assertBioMedia(workspaceId: string, input: ReturnType<typeof toBiopageInput>): Promise<void> {
  await assertOwnedMedia(workspaceId, input.avatarUrl);
  await assertOwnedMedia(workspaceId, input.logoUrl);
  await assertOwnedMedia(workspaceId, input.coverUrl);
  await assertOwnedMedia(workspaceId, input.ogImageUrl);
  await assertOwnedMedia(workspaceId, input.bgImageUrl);
  await assertOwnedMedia(workspaceId, input.adMobileImage);
  await assertOwnedMedia(workspaceId, input.adLeftImage);
  await assertOwnedMedia(workspaceId, input.adRightImage);
  for (const block of input.blocks) {
    if (block.type === "link") {
      await assertOwnedMedia(workspaceId, block.iconUrl);
    }
    if (block.type === "image") {
      await assertOwnedMedia(workspaceId, block.url);
    }
  }
}

function assertBioFeatures(
  plan: Parameters<typeof assertFeature>[0],
  input: ReturnType<typeof toBiopageInput>,
): void {
  if (input.customCss.trim() !== "") {
    assertFeature(plan, "customCss");
  }
  if (input.blocks.some((block) => block.type === "form")) {
    assertFeature(plan, "bioForms");
  }
  if (input.password) {
    assertFeature(plan, "passwordProtection");
  }
}

export async function createBiopageAction(
  values: BioFormValues,
): Promise<ActionResult<SavedBiopage>> {
  try {
    const context = await requireWorkspace();
    const input = toBiopageInput(values);
    await assertBioMedia(context.workspace.id, input);
    assertBioFeatures(context.plan, input);

    await assertQuota(context.workspace.id, context.plan, "biopages");
    assertSlugLength({
      slug: input.handle,
      plan: context.plan,
      isSuperadmin: context.isSuperadmin,
      kind: "handle",
    });

    if (await handleTaken(input.handle, input.domainId)) {
      return fail("handle_taken");
    }

    const row = await createBiopage(context.workspace.id, input);

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "biopage.create",
      targetType: "biopage",
      targetId: row.id,
      metadata: { handle: row.handle },
    });

    revalidatePath("/bio");
    revalidatePath(`/${row.handle}`);
    return ok({ id: row.id, handle: row.handle });
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateBiopageAction(
  id: string,
  values: BioFormValues,
): Promise<ActionResult<SavedBiopage>> {
  try {
    const context = await requireWorkspace();
    const input = toBiopageInput(values);
    await assertBioMedia(context.workspace.id, input);
    assertBioFeatures(context.plan, input);
    const existing = await getBiopage(context.workspace.id, id);
    assertSlugLength({
      slug: input.handle,
      plan: context.plan,
      isSuperadmin: context.isSuperadmin,
      previous: existing?.handle,
      kind: "handle",
    });

    if (await handleTaken(input.handle, input.domainId, id)) {
      return fail("handle_taken");
    }

    const row = await updateBiopage(context.workspace.id, id, input);

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "biopage.update",
      targetType: "biopage",
      targetId: row.id,
      metadata: { handle: row.handle, published: row.published },
    });

    revalidatePath("/bio");
    revalidatePath(`/bio/${id}/edit`);
    revalidatePath(`/${row.handle}`);
    if (existing && existing.handle !== row.handle) {
      revalidatePath(`/${existing.handle}`);
    }
    return ok({ id: row.id, handle: row.handle });
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteBiopageAction(id: string): Promise<ActionResult<null>> {
  try {
    const context = await requireWorkspace();
    const existing = await getBiopage(context.workspace.id, id);
    await deleteBiopage(context.workspace.id, id);

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "biopage.delete",
      targetType: "biopage",
      targetId: id,
    });

    revalidatePath("/bio");
    if (existing) {
      revalidatePath(`/${existing.handle}`);
    }
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

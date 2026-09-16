"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { createBiopage, deleteBiopage, getBiopage, handleTaken, updateBiopage } from "@/lib/biopages";
import { toBiopageInput, type BioFormValues } from "@/lib/bio-form";
import { assertQuota, assertSlugLength } from "@/lib/quota";
import { requireWorkspace } from "@/lib/session";

export type SavedBiopage = { id: string; handle: string };

export async function createBiopageAction(
  values: BioFormValues,
): Promise<ActionResult<SavedBiopage>> {
  try {
    const context = await requireWorkspace();
    const input = toBiopageInput(values);

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
    // The published page is rendered with ISR, so the new content needs a purge.
    revalidatePath(`/${row.handle}`);
    return ok({ id: row.id, handle: row.handle });
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteBiopageAction(id: string): Promise<ActionResult<null>> {
  try {
    const context = await requireWorkspace();
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
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

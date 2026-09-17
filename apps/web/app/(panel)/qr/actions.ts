"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { assertOwnedMedia } from "@/lib/media";
import { assertFeature, assertQuota } from "@/lib/quota";
import { createQrCode, deleteQrCode, updateQrCode } from "@/lib/qr-codes";
import { toQrInput, type QrFormValues } from "@/lib/qr-form";
import { ok, toActionError, type ActionResult } from "@/lib/action-result";
import { requireWorkspace } from "@/lib/session";

export type SavedQrCode = { id: string; name: string };

export async function createQrCodeAction(
  values: QrFormValues,
): Promise<ActionResult<SavedQrCode>> {
  try {
    const context = await requireWorkspace();
    const input = toQrInput(values);

    await assertQuota(context.workspace.id, context.plan, "qrCodes");
    if (input.style.logoUrl) {
      assertFeature(context.plan, "qrLogo");
      await assertOwnedMedia(context.workspace.id, input.style.logoUrl);
    }

    const row = await createQrCode(context.workspace.id, input);

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "qr.create",
      targetType: "qr_code",
      targetId: row.id,
      metadata: { name: row.name, linkId: row.linkId },
    });

    revalidatePath("/qr");
    return ok({ id: row.id, name: row.name });
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateQrCodeAction(
  id: string,
  values: QrFormValues,
): Promise<ActionResult<SavedQrCode>> {
  try {
    const context = await requireWorkspace();
    const input = toQrInput(values);

    if (input.style.logoUrl) {
      assertFeature(context.plan, "qrLogo");
      await assertOwnedMedia(context.workspace.id, input.style.logoUrl);
    }

    const row = await updateQrCode(context.workspace.id, id, input);

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "qr.update",
      targetType: "qr_code",
      targetId: row.id,
      metadata: { name: row.name, linkId: row.linkId },
    });

    revalidatePath("/qr");
    revalidatePath(`/qr/${id}`);
    return ok({ id: row.id, name: row.name });
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteQrCodeAction(id: string): Promise<ActionResult<null>> {
  try {
    const context = await requireWorkspace();
    await deleteQrCode(context.workspace.id, id);

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "qr.delete",
      targetType: "qr_code",
      targetId: id,
    });

    revalidatePath("/qr");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

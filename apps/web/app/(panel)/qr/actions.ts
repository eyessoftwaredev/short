"use server";

import type { QrInput } from "@short/core";
import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { getLink } from "@/lib/links";
import { assertQrLogo } from "@/lib/media";
import { assertFeature, assertQuota } from "@/lib/quota";
import {
  createQrCode,
  deleteQrCode,
  getLatestQrCodeForLink,
  getQrCode,
  updateQrCode,
} from "@/lib/qr-codes";
import { emptyQrForm, toQrInput, toQrStyle, type QrFormValues } from "@/lib/qr-form";
import { qrFits } from "@/lib/qr-svg";
import { createQrTemplate, deleteQrTemplate } from "@/lib/qr-templates";
import { fail, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { requireWorkspace, type WorkspaceContext } from "@/lib/session";

export type SavedQrCode = { id: string; name: string };

/**
 * The one creation path: plan quota, the paid logo gate, logo ownership, audit and
 * revalidation. The designer and the link shortcuts both go through it.
 */
async function insertQrCode(context: WorkspaceContext, input: QrInput): Promise<SavedQrCode> {
  await assertQuota(context.workspace.id, context.plan, "qrCodes");
  if (input.style.logoUrl) {
    assertFeature(context.plan, "qrLogo");
    await assertQrLogo(context.workspace.id, input.style.logoUrl);
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
  if (row.linkId) {
    revalidatePath(`/links/${row.linkId}`);
  }
  return { id: row.id, name: row.name };
}

/**
 * Standalone payloads (vCard, Wi-Fi, long URLs) can exceed what one QR code holds. The
 * designer blocks that too, but the server is the one that must not store a code that
 * can never be drawn.
 */
function payloadTooLong(input: QrInput): ActionResult<never> | null {
  if (input.payloadKind !== "link" && input.payload && !qrFits(input.payload, input.style)) {
    return fail("validation", { payload: ["payloadTooLong"] });
  }
  return null;
}

export async function createQrCodeAction(
  values: QrFormValues,
): Promise<ActionResult<SavedQrCode>> {
  try {
    const context = await requireWorkspace();
    const input = toQrInput(values);
    return payloadTooLong(input) ?? ok(await insertQrCode(context, input));
  } catch (error) {
    return toActionError(error);
  }
}

export type LinkQrCode = SavedQrCode & { created: boolean };

/**
 * "QR code" shortcut on a link: opens the newest code that already encodes the link, or
 * creates one with the designer's default style. Reusing first also makes a double
 * click harmless instead of producing two codes.
 */
export async function openQrCodeForLinkAction(
  linkId: string,
): Promise<ActionResult<LinkQrCode>> {
  try {
    const context = await requireWorkspace();
    if (typeof linkId !== "string") {
      return fail("not_found");
    }
    const link = await getLink(context.workspace.id, linkId);
    if (!link) {
      return fail("not_found");
    }

    const { latest } = await getLatestQrCodeForLink(context.workspace.id, link.id);
    if (latest) {
      return ok({ id: latest.id, name: latest.name, created: false });
    }

    const label = link.title?.trim() || `${link.hostname}/${link.slug}`;
    const saved = await insertQrCode(
      context,
      toQrInput({ ...emptyQrForm(link.id), name: label.slice(0, 120) }),
    );
    return ok({ ...saved, created: true });
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
    const tooLong = payloadTooLong(input);
    if (tooLong) {
      return tooLong;
    }

    const existing = await getQrCode(context.workspace.id, id);
    if (!existing) {
      return fail("generic");
    }
    // Keeping a logo that was added before a downgrade is allowed, like every other
    // update; only adding or swapping a logo needs the paid feature.
    if (input.style.logoUrl && input.style.logoUrl !== existing.style.logoUrl) {
      assertFeature(context.plan, "qrLogo");
      await assertQrLogo(context.workspace.id, input.style.logoUrl);
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
    for (const linkId of new Set([existing.linkId, row.linkId])) {
      if (linkId) {
        revalidatePath(`/links/${linkId}`);
      }
    }
    return ok({ id: row.id, name: row.name });
  } catch (error) {
    return toActionError(error);
  }
}

export type SavedQrTemplate = { id: string; name: string };

export async function saveQrTemplateAction(
  name: string,
  values: QrFormValues,
): Promise<ActionResult<SavedQrTemplate>> {
  try {
    const context = await requireWorkspace();
    const style = toQrStyle(values);

    if (style.logoUrl) {
      assertFeature(context.plan, "qrLogo");
      await assertQrLogo(context.workspace.id, style.logoUrl);
    }

    const row = await createQrTemplate(context.workspace.id, context.user.id, { name, style });
    revalidatePath("/qr");
    return ok({ id: row.id, name: row.name });
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteQrTemplateAction(id: string): Promise<ActionResult<null>> {
  try {
    const context = await requireWorkspace();
    const deleted = await deleteQrTemplate(context.workspace.id, id);
    if (!deleted) {
      return fail("not_found");
    }
    revalidatePath("/qr");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteQrCodeAction(id: string): Promise<ActionResult<null>> {
  try {
    const context = await requireWorkspace();
    const existing = await getQrCode(context.workspace.id, id);
    if (!existing || !(await deleteQrCode(context.workspace.id, id))) {
      return fail("generic");
    }

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "qr.delete",
      targetType: "qr_code",
      targetId: id,
    });

    revalidatePath("/qr");
    if (existing.linkId) {
      revalidatePath(`/links/${existing.linkId}`);
    }
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

"use server";

import { getDb, workspaceMedia } from "@short/db";
import { fail, ok, toActionError, type ActionResult } from "@/lib/action-result";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_MEDIA_BYTES,
  mediaUrl,
} from "@/lib/media";
import { requireWorkspace } from "@/lib/session";

export type UploadedMedia = { id: string; url: string; contentType: string };

export async function uploadWorkspaceMediaAction(
  formData: FormData,
): Promise<ActionResult<UploadedMedia>> {
  try {
    const context = await requireWorkspace();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return fail("media_missing");
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      return fail("media_type");
    }
    if (file.size > MAX_MEDIA_BYTES) {
      return fail("media_size");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const [row] = await getDb()
      .insert(workspaceMedia)
      .values({
        workspaceId: context.workspace.id,
        kind: "image",
        contentType: file.type,
        bytes,
      })
      .returning({ id: workspaceMedia.id, contentType: workspaceMedia.contentType });

    if (!row) {
      return fail("media_save");
    }

    return ok({ id: row.id, url: mediaUrl(row.id), contentType: row.contentType });
  } catch (error) {
    return toActionError(error);
  }
}

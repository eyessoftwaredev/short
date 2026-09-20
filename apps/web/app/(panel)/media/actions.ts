"use server";

import { fail, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { uploadWorkspaceMedia, type UploadedMedia } from "@/lib/media";
import { requireWorkspace } from "@/lib/session";

export type { UploadedMedia };

/** @deprecated Prefer POST /api/media — Server Actions can crash RSC on the same route. */
export async function uploadWorkspaceMediaAction(
  formData: FormData,
): Promise<ActionResult<UploadedMedia>> {
  try {
    const context = await requireWorkspace();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return fail("media_missing");
    }

    const data = await uploadWorkspaceMedia({
      workspaceId: context.workspace.id,
      uploadedBy: context.user.id,
      file,
    });
    return ok(data);
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "media_missing" ||
        error.message === "media_type" ||
        error.message === "media_size" ||
        error.message === "media_save"
      ) {
        return fail(error.message);
      }
    }
    return toActionError(error);
  }
}

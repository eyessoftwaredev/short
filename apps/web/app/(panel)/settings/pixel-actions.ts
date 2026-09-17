"use server";

import { z } from "zod";
import { PIXEL_PROVIDERS } from "@short/db";
import { fromZodError, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { upsertPixel } from "@/lib/pixels";
import { requireWorkspaceRole } from "@/lib/session";
import { revalidatePath } from "next/cache";

const schema = z.object({
  provider: z.enum(PIXEL_PROVIDERS),
  pixelId: z.string().trim().min(1).max(128),
  accessToken: z.string().trim().max(512).optional(),
  enabled: z.boolean(),
});

export async function savePixelAction(values: unknown): Promise<ActionResult<null>> {
  try {
    const context = await requireWorkspaceRole("admin");
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }
    await upsertPixel({ workspaceId: context.workspace.id, ...parsed.data });
    revalidatePath("/settings");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

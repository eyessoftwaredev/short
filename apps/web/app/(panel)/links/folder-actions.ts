"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, fromZodError, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { createFolder, deleteFolder, renameFolder } from "@/lib/folders";
import { requireWorkspace } from "@/lib/session";

const nameSchema = z.string().trim().min(1).max(80);

export async function createFolderAction(name: string): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireWorkspace();
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }
    const row = await createFolder(context.workspace.id, parsed.data);
    revalidatePath("/links");
    return ok({ id: row.id });
  } catch (error) {
    return toActionError(error);
  }
}

export async function renameFolderAction(
  id: string,
  name: string,
): Promise<ActionResult<null>> {
  try {
    const context = await requireWorkspace();
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }
    await renameFolder(context.workspace.id, id, parsed.data);
    revalidatePath("/links");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteFolderAction(id: string): Promise<ActionResult<null>> {
  try {
    const context = await requireWorkspace();
    if (!z.string().uuid().safeParse(id).success) {
      return fail("validation");
    }
    await deleteFolder(context.workspace.id, id);
    revalidatePath("/links");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

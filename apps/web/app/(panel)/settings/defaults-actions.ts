"use server";

import { revalidatePath } from "next/cache";
import { fail, fromZodError, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { canAdministerWorkspace, requireWorkspace } from "@/lib/session";
import {
  getLinkDefaults,
  getWorkspaceSettings,
  linkFormDefaults,
  saveWorkspaceSettings,
  workspaceSettingsInputSchema,
  type LinkFormDefaults,
  type WorkspaceSettings,
  type WorkspaceSettingsInput,
} from "@/lib/workspace-settings";

/** Current link defaults and notification switches (column defaults when never saved). */
export async function getWorkspaceSettingsAction(): Promise<ActionResult<WorkspaceSettings>> {
  try {
    const context = await requireWorkspace();
    return ok(await getWorkspaceSettings(context.workspace.id));
  } catch (error) {
    return toActionError(error);
  }
}

/** Editor prefill for a new link: spread over `emptyLinkForm(domainId)`. */
export async function getLinkFormDefaultsAction(): Promise<ActionResult<LinkFormDefaults>> {
  try {
    const context = await requireWorkspace();
    return ok(linkFormDefaults(await getLinkDefaults(context.workspace.id)));
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Owner/admin only. Partial: only the fields sent are changed.
 * Errors: `forbidden`, `validation`, `not_found` (folder or template not in this workspace).
 */
export async function saveWorkspaceSettingsAction(
  values: WorkspaceSettingsInput,
): Promise<ActionResult<WorkspaceSettings>> {
  try {
    const context = await requireWorkspace();
    if (!canAdministerWorkspace(context)) {
      return fail("forbidden");
    }
    const parsed = workspaceSettingsInputSchema.safeParse(values);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    let settings: WorkspaceSettings;
    try {
      settings = await saveWorkspaceSettings(context.workspace.id, parsed.data);
    } catch (error) {
      if (error instanceof Error && (error.message === "Folder not found" || error.message === "UTM template not found")) {
        return fail("not_found");
      }
      throw error;
    }

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "workspace.settings.updated",
      targetType: "workspace",
      targetId: context.workspace.id,
      metadata: { ...parsed.data },
    });

    revalidatePath("/settings");
    revalidatePath("/links/new");
    return ok(settings);
  } catch (error) {
    return toActionError(error);
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { exportWorkspaceLinks, importLinksCsv } from "@/lib/link-csv";
import { listWorkspaceDomains } from "@/lib/links";
import { requireWorkspaceRole } from "@/lib/session";

export async function exportLinksCsvAction(): Promise<ActionResult<string>> {
  try {
    const context = await requireWorkspaceRole("admin");
    return ok(await exportWorkspaceLinks(context.workspace.id));
  } catch (error) {
    return toActionError(error);
  }
}

export async function importLinksCsvAction(text: string): Promise<
  ActionResult<{ created: number; skipped: number; errors: string[] }>
> {
  try {
    const context = await requireWorkspaceRole("admin");
    const domains = await listWorkspaceDomains(context.workspace.id);
    const domain = domains.find((row) => row.isDefault) ?? domains[0];
    if (!domain) {
      return fail("domain_missing");
    }
    const result = await importLinksCsv(context.workspace.id, domain.id, text);
    revalidatePath("/links");
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}

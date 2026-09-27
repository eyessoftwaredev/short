"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { incrementLinksCreated } from "@/lib/billing";
import { scanDestination } from "@/lib/abuse";
import { fail, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { exportWorkspaceLinks, importLinksCsv } from "@/lib/link-csv";
import { listWorkspaceDomains } from "@/lib/links";
import { assertQuota, assertSlugLength, getWorkspaceUsage } from "@/lib/quota";
import { requireWorkspaceRole } from "@/lib/session";

/** ~1 MB of CSV; the importer also caps the row count. */
const MAX_IMPORT_CHARS = 1_000_000;

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
    if (typeof text !== "string" || text.length > MAX_IMPORT_CHARS) {
      return fail("validation");
    }
    const domains = await listWorkspaceDomains(context.workspace.id);
    const domain = domains.find((row) => row.isDefault) ?? domains[0];
    if (!domain) {
      return fail("domain_missing");
    }

    // Fails fast when the plan is already full; `remaining` then caps the import itself.
    await assertQuota(context.workspace.id, context.plan, "links");
    const limit = context.plan.limits.links;
    const usage = await getWorkspaceUsage(context.workspace.id);
    const remaining = limit === -1 ? null : Math.max(0, limit - usage.links);

    const result = await importLinksCsv(
      {
        workspaceId: context.workspace.id,
        domainId: domain.id,
        creatorId: context.user.id,
        remaining,
        checkSlug: (slug) =>
          assertSlugLength({ slug, plan: context.plan, isSuperadmin: context.isSuperadmin }),
        afterCreate: async (link) => {
          await scanDestination(context.workspace.id, link.id, link.destination);
          await incrementLinksCreated(context.workspace.id);
        },
      },
      text,
    );

    if (result.created > 0) {
      await recordAudit({
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        impersonatorId: context.impersonatedBy,
        action: "link.imported",
        targetType: "workspace",
        targetId: context.workspace.id,
        metadata: { created: result.created, skipped: result.skipped },
      });
    }

    revalidatePath("/links");
    revalidatePath("/dashboard");
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}

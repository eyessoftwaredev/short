"use server";

import { domainInputSchema, hostnameSchema } from "@short/core";
import { revalidatePath } from "next/cache";
import { fail, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { CloudflareError, type HostnameHealth } from "@/lib/cloudflare";
import {
  addDomain,
  hostnameExists,
  refreshDomain,
  removeDomain,
  updateDomainSettings,
} from "@/lib/domains";
import { resyncWorkspaceLinks } from "@/lib/links";
import { assertQuota } from "@/lib/quota";
import { requireWorkspaceRole } from "@/lib/session";

export type AddedDomain = { id: string; hostname: string; health: HostnameHealth | null };

export async function addDomainAction(hostname: string): Promise<ActionResult<AddedDomain>> {
  try {
    const context = await requireWorkspaceRole("admin");

    const parsed = hostnameSchema.safeParse(hostname);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Enter a valid hostname");
    }

    await assertQuota(context.workspace.id, context.plan, "customDomains");

    if (await hostnameExists(parsed.data)) {
      return fail(`${parsed.data} is already connected to a workspace.`);
    }

    const result = await addDomain(context.workspace.id, {
      hostname: parsed.data,
      rootDestination: null,
      notFoundDestination: null,
      isDefault: false,
    });

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "domain.add",
      targetType: "domain",
      targetId: result.domain.id,
      metadata: { hostname: result.domain.hostname },
    });

    revalidatePath("/domains");
    return ok({
      id: result.domain.id,
      hostname: result.domain.hostname,
      health: result.health,
    });
  } catch (error) {
    if (error instanceof CloudflareError) {
      return fail(`Cloudflare rejected this hostname: ${error.message}`);
    }
    return toActionError(error);
  }
}

const settingsSchema = domainInputSchema.pick({
  rootDestination: true,
  notFoundDestination: true,
  isDefault: true,
});

export async function updateDomainAction(
  id: string,
  values: {
    rootDestination: string;
    notFoundDestination: string;
    isDefault: boolean;
  },
): Promise<ActionResult<null>> {
  try {
    const context = await requireWorkspaceRole("admin");

    const parsed = settingsSchema.safeParse({
      rootDestination: values.rootDestination === "" ? null : values.rootDestination,
      notFoundDestination: values.notFoundDestination === "" ? null : values.notFoundDestination,
      isDefault: values.isDefault,
    });

    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Check the destination URLs");
    }

    await updateDomainSettings(context.workspace.id, id, parsed.data);

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "domain.update",
      targetType: "domain",
      targetId: id,
      metadata: { isDefault: parsed.data.isDefault },
    });

    revalidatePath("/domains");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function refreshDomainAction(
  id: string,
): Promise<ActionResult<{ status: string; health: HostnameHealth | null }>> {
  try {
    const context = await requireWorkspaceRole("admin");
    const result = await refreshDomain(context.workspace.id, id);

    revalidatePath("/domains");
    return ok({ status: result.domain.status, health: result.health });
  } catch (error) {
    if (error instanceof CloudflareError) {
      return fail(`Cloudflare check failed: ${error.message}`);
    }
    return toActionError(error);
  }
}

export async function removeDomainAction(id: string): Promise<ActionResult<null>> {
  try {
    const context = await requireWorkspaceRole("admin");
    await removeDomain(context.workspace.id, id);

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "domain.remove",
      targetType: "domain",
      targetId: id,
    });

    revalidatePath("/domains");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

/** Manual escape hatch when KV and Postgres drift, e.g. after a Cloudflare outage. */
export async function resyncKvAction(): Promise<ActionResult<{ count: number }>> {
  try {
    const context = await requireWorkspaceRole("admin");
    const count = await resyncWorkspaceLinks(context.workspace.id);

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "domain.resync",
      targetType: "workspace",
      targetId: context.workspace.id,
      metadata: { links: count },
    });

    return ok({ count });
  } catch (error) {
    return toActionError(error);
  }
}

"use server";

import { domainInputSchema, hostnameSchema } from "@short/core";
import { revalidatePath } from "next/cache";
import { fail, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { CloudflareError, type HostnameHealth } from "@/lib/cloudflare";
import {
  applyCustomerDns,
  customerZoneHasCname,
  CustomerCloudflareError,
  disconnectCustomerCloudflare,
  type AppliedDns,
} from "@/lib/customer-cloudflare";
import { probeDomainDns, type DnsProbe } from "@/lib/dns-probe";
import {
  addDomain,
  cnameTarget,
  getDomain,
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
      const www = parsed.error.issues.some((issue) => issue.message.toLowerCase().includes("www"));
      return fail(www ? "domain_www" : "domain_invalid");
    }

    await assertQuota(context.workspace.id, context.plan, "customDomains");

    if (await hostnameExists(parsed.data, context.workspace.id)) {
      return fail("domain_taken");
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
    revalidatePath(`/domains/${result.domain.id}`);
    return ok({
      id: result.domain.id,
      hostname: result.domain.hostname,
      health: result.health,
    });
  } catch (error) {
    if (error instanceof CloudflareError) {
      return fail("cloudflare_rejected", { detail: [error.message] });
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
      return fail("validation");
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
    revalidatePath(`/domains/${id}`);
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
    revalidatePath(`/domains/${id}`);
    return ok({ status: result.domain.status, health: result.health });
  } catch (error) {
    if (error instanceof CloudflareError) {
      return fail("cloudflare_check_failed", { detail: [error.message] });
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
    revalidatePath(`/domains/${id}`);
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

function fromCustomerCloudflare(error: unknown): ActionResult<never> {
  if (error instanceof CustomerCloudflareError) {
    if (error.code === "missing") {
      return fail("cf_not_connected");
    }
    if (error.code === "token") {
      return fail("cf_token_invalid");
    }
    if (error.code === "zone") {
      return fail("cf_no_zone", { host: [error.message] });
    }
    return fail("cf_dns_failed", { detail: [error.message] });
  }
  return toActionError(error);
}

export async function probeDomainDnsAction(id: string): Promise<ActionResult<DnsProbe>> {
  try {
    const context = await requireWorkspaceRole("admin");
    const domain = await getDomain(context.workspace.id, id);
    if (!domain) {
      return fail("not_found");
    }
    const target = cnameTarget();
    const probe = await probeDomainDns(domain.hostname, domain.validationRecords, target);
    const cname = probe.records.find((record) => record.type === "CNAME");
    if (cname && cname.status !== "ok") {
      try {
        if (await customerZoneHasCname(context.workspace.id, domain.hostname, target)) {
          cname.status = "ok";
          cname.found = [target];
          probe.ready = probe.records.every((record) => record.status === "ok");
        }
      } catch {
        // Public DNS remains the source of truth when the zone API is unavailable.
      }
    }
    return ok(probe);
  } catch (error) {
    return toActionError(error);
  }
}

export async function disconnectCloudflareAction(): Promise<ActionResult<null>> {
  try {
    const context = await requireWorkspaceRole("admin");
    await disconnectCustomerCloudflare(context.workspace.id);
    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "domain.cloudflare.disconnect",
      targetType: "workspace",
      targetId: context.workspace.id,
    });
    revalidatePath("/domains");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

export async function applyCloudflareDnsAction(id: string): Promise<ActionResult<AppliedDns>> {
  try {
    const context = await requireWorkspaceRole("admin");
    const domain = await getDomain(context.workspace.id, id);
    if (!domain) {
      return fail("not_found");
    }

    const applied = await applyCustomerDns({
      workspaceId: context.workspace.id,
      hostname: domain.hostname,
      cnameTarget: cnameTarget(),
      validation: domain.validationRecords,
    });

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "domain.cloudflare.dns",
      targetType: "domain",
      targetId: id,
      metadata: { hostname: domain.hostname, zone: applied.zone },
    });

    revalidatePath("/domains");
    revalidatePath(`/domains/${id}`);
    return ok(applied);
  } catch (error) {
    return fromCustomerCloudflare(error);
  }
}

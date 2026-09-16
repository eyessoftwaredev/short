import { KV_SCHEMA_VERSION, type DomainInput, type DomainKvRecord } from "@short/core";
import {
  and,
  count,
  desc,
  domains,
  eq,
  getDb,
  links,
  ne,
  type DomainRow,
} from "@short/db";
import {
  CloudflareError,
  cloudflareEnabled,
  createCustomHostname,
  deleteCustomHostname,
  getCustomHostname,
  toHealth,
  type HostnameHealth,
} from "./cloudflare";
import { serverEnv } from "./env";
import { deleteDomainRecord, putDomainRecord } from "./kv";
import { dispatchWebhook } from "./webhooks";

export type DomainWithUsage = DomainRow & { linkCount: number };

export function toDomainKvRecord(domain: DomainRow): DomainKvRecord {
  return {
    v: KV_SCHEMA_VERSION,
    id: domain.id,
    workspaceId: domain.workspaceId,
    hostname: domain.hostname,
    status: domain.status,
    rootDestination: domain.rootDestination,
    notFoundDestination: domain.notFoundDestination,
  };
}

export async function listDomains(workspaceId: string): Promise<DomainWithUsage[]> {
  const db = getDb();
  const rows = await db
    .select({
      domain: domains,
      linkCount: count(links.id),
    })
    .from(domains)
    .leftJoin(links, eq(links.domainId, domains.id))
    .where(eq(domains.workspaceId, workspaceId))
    .groupBy(domains.id)
    .orderBy(desc(domains.isPlatform), desc(domains.createdAt));

  return rows.map((row) => ({ ...row.domain, linkCount: row.linkCount }));
}

export async function getDomain(workspaceId: string, id: string): Promise<DomainRow | null> {
  const [row] = await getDb()
    .select()
    .from(domains)
    .where(and(eq(domains.workspaceId, workspaceId), eq(domains.id, id)))
    .limit(1);
  return row ?? null;
}

export async function hostnameExists(hostname: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: domains.id })
    .from(domains)
    .where(eq(domains.hostname, hostname))
    .limit(1);
  return row != null;
}

/** Only one domain per workspace can be the default; flipping one clears the rest. */
async function clearOtherDefaults(workspaceId: string, keepId: string): Promise<void> {
  await getDb()
    .update(domains)
    .set({ isDefault: false })
    .where(and(eq(domains.workspaceId, workspaceId), ne(domains.id, keepId)));
}

export type AddDomainResult = { domain: DomainRow; health: HostnameHealth | null };

/**
 * Registers the hostname with Cloudflare for SaaS and stores it as pending. The customer
 * then adds the CNAME; `refreshDomain` promotes it to active once the certificate lands.
 */
export async function addDomain(
  workspaceId: string,
  input: DomainInput,
): Promise<AddDomainResult> {
  const db = getDb();

  let cfHostnameId: string | null = null;
  let health: HostnameHealth | null = null;

  if (cloudflareEnabled()) {
    const record = await createCustomHostname(input.hostname);
    cfHostnameId = record.id;
    health = toHealth(record);
  }

  const [row] = await db
    .insert(domains)
    .values({
      workspaceId,
      hostname: input.hostname,
      cfHostnameId,
      status: health?.status ?? "pending",
      sslStatus: health?.sslStatus ?? "pending",
      rootDestination: input.rootDestination,
      notFoundDestination: input.notFoundDestination,
      isDefault: input.isDefault,
      validationRecords: health?.validation ?? [],
    })
    .returning();

  if (!row) {
    throw new Error("Failed to add domain");
  }

  if (row.isDefault) {
    await clearOtherDefaults(workspaceId, row.id);
  }
  await putDomainRecord(toDomainKvRecord(row));

  return { domain: row, health };
}

export async function updateDomainSettings(
  workspaceId: string,
  id: string,
  input: Pick<DomainInput, "rootDestination" | "notFoundDestination" | "isDefault">,
): Promise<DomainRow> {
  const db = getDb();
  const [row] = await db
    .update(domains)
    .set({
      rootDestination: input.rootDestination,
      notFoundDestination: input.notFoundDestination,
      isDefault: input.isDefault,
      updatedAt: new Date(),
    })
    .where(and(eq(domains.workspaceId, workspaceId), eq(domains.id, id)))
    .returning();

  if (!row) {
    throw new Error("Domain not found");
  }

  if (row.isDefault) {
    await clearOtherDefaults(workspaceId, row.id);
  }
  await putDomainRecord(toDomainKvRecord(row));
  return row;
}

/** Re-reads Cloudflare and persists the current DNS/SSL state. */
export async function refreshDomain(
  workspaceId: string,
  id: string,
): Promise<{ domain: DomainRow; health: HostnameHealth | null }> {
  const domain = await getDomain(workspaceId, id);
  if (!domain) {
    throw new Error("Domain not found");
  }

  if (!domain.cfHostnameId || !cloudflareEnabled()) {
    return { domain, health: null };
  }

  let health: HostnameHealth;
  try {
    health = toHealth(await getCustomHostname(domain.cfHostnameId));
  } catch (error) {
    if (error instanceof CloudflareError && error.status === 404) {
      // The hostname was removed on Cloudflare's side; surface it instead of looping.
      health = {
        status: "error",
        sslStatus: "missing",
        message: "This hostname is no longer registered with Cloudflare. Remove and re-add it.",
        validation: [],
      };
    } else {
      throw error;
    }
  }

  const [row] = await getDb()
    .update(domains)
    .set({
      status: health.status,
      sslStatus: health.sslStatus,
      lastCheckedAt: new Date(),
      verifiedAt: health.status === "active" ? (domain.verifiedAt ?? new Date()) : null,
      validationRecords: health.status === "active" ? [] : health.validation,
      updatedAt: new Date(),
    })
    .where(eq(domains.id, id))
    .returning();

  const updated = row ?? domain;
  await putDomainRecord(toDomainKvRecord(updated));

  // Fires once, on the check that flips the hostname to active.
  if (domain.status !== "active" && updated.status === "active") {
    await dispatchWebhook(workspaceId, "domain.verified", {
      id: updated.id,
      hostname: updated.hostname,
      sslStatus: updated.sslStatus,
    });
  }

  return { domain: updated, health };
}

export async function removeDomain(workspaceId: string, id: string): Promise<void> {
  const domain = await getDomain(workspaceId, id);
  if (!domain) {
    return;
  }
  if (domain.isPlatform) {
    throw new Error("The platform domain cannot be removed");
  }

  if (domain.cfHostnameId && cloudflareEnabled()) {
    try {
      await deleteCustomHostname(domain.cfHostnameId);
    } catch (error) {
      // A missing hostname on Cloudflare should not block the local cleanup.
      console.error("failed to delete custom hostname", error);
    }
  }

  await getDb().delete(domains).where(eq(domains.id, id));
  await deleteDomainRecord(domain.hostname);
}

export function cnameTarget(): string {
  return serverEnv().CUSTOM_HOSTNAME_TARGET;
}

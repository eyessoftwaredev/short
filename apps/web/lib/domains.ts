import { KV_SCHEMA_VERSION, type DomainInput, type DomainKvRecord } from "@short/core";
import {
  and,
  asc,
  biopages,
  count,
  desc,
  domains,
  ensurePlatformDomain,
  eq,
  getDb,
  inArray,
  isNotNull,
  isNull,
  links,
  lt,
  ne,
  or,
  type DomainRow,
} from "@short/db";
import { platformHostname } from "./biopages";
import {
  CloudflareError,
  cloudflareEnabled,
  ensureCustomHostname,
  deleteCustomHostname,
  getCustomHostname,
  toHealth,
  type HostnameHealth,
} from "./cloudflare";
import { serverEnv, siteUrl } from "./env";
import {
  deleteBiopageRecord,
  deleteDomainRecord,
  deleteLinkRecord,
  putDomainRecord,
} from "./kv";
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
  await ensurePlatformDomain(db, serverEnv().PLATFORM_SHORT_DOMAIN);
  const rows = await db
    .select({
      domain: domains,
      linkCount: count(links.id),
    })
    .from(domains)
    .leftJoin(links, eq(links.domainId, domains.id))
    .where(and(eq(domains.workspaceId, workspaceId), eq(domains.isPlatform, false)))
    .groupBy(domains.id)
    .orderBy(desc(domains.createdAt));

  return rows.map((row) => ({ ...row.domain, linkCount: row.linkCount }));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getDomain(workspaceId: string, id: string): Promise<DomainRow | null> {
  // The column is a uuid; a hand-typed id would fail the cast instead of reading as "not found".
  if (!UUID.test(id)) {
    return null;
  }
  const [row] = await getDb()
    .select()
    .from(domains)
    .where(and(eq(domains.workspaceId, workspaceId), eq(domains.id, id)))
    .limit(1);
  return row ?? null;
}

/** Short links on one domain — shown before removal, which deletes them. */
export async function countDomainLinks(domainId: string): Promise<number> {
  const [row] = await getDb().select({ value: count() }).from(links).where(eq(links.domainId, domainId));
  return row?.value ?? 0;
}

export async function getDomainByHostname(hostname: string): Promise<DomainRow | null> {
  const [row] = await getDb().select().from(domains).where(eq(domains.hostname, hostname)).limit(1);
  return row ?? null;
}

function hostOf(value: string): string {
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * The panel, marketing site, shared short domain and CNAME target belong to the platform.
 * A customer claim on any of them (or a subdomain) would hijack platform traffic on the
 * edge, so they are refused before Cloudflare is ever asked.
 */
export function isPlatformOwnedHostname(hostname: string): boolean {
  const env = serverEnv();
  let site = "";
  try {
    site = siteUrl();
  } catch {
    site = "";
  }
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const owned = [env.APP_URL, env.BETTER_AUTH_URL, site, env.PLATFORM_SHORT_DOMAIN, env.CUSTOM_HOSTNAME_TARGET]
    .map(hostOf)
    .filter((value) => value !== "" && value !== "localhost");
  return owned.some((root) => host === root || host.endsWith(`.${root}`));
}

/** True when the hostname is already on this account, platform-owned, or DNS-verified elsewhere. */
export function hostnameReserved(row: DomainRow, workspaceId: string): boolean {
  if (row.workspaceId === workspaceId || row.isPlatform) {
    return true;
  }
  return row.status === "active" || row.status === "provisioning";
}

/** Links or bio pages on a claim; releasing it would cascade-delete another workspace's work. */
async function claimHasContent(domainId: string): Promise<boolean> {
  const db = getDb();
  const [[linkCount], [pageCount]] = await Promise.all([
    db.select({ value: count() }).from(links).where(eq(links.domainId, domainId)),
    db.select({ value: count() }).from(biopages).where(eq(biopages.domainId, domainId)),
  ]);
  return (linkCount?.value ?? 0) > 0 || (pageCount?.value ?? 0) > 0;
}

/** A foreign claim can be taken over only while it is unverified and still empty. */
async function claimReserved(row: DomainRow, workspaceId: string): Promise<boolean> {
  return hostnameReserved(row, workspaceId) || (await claimHasContent(row.id));
}

export async function hostnameExists(hostname: string, workspaceId?: string): Promise<boolean> {
  const row = await getDomainByHostname(hostname);
  if (!row) {
    return false;
  }
  if (workspaceId) {
    return claimReserved(row, workspaceId);
  }
  return true;
}

const KV_PURGE_CONCURRENCY = 8;

async function inBatches<T>(items: T[], run: (item: T) => Promise<void>): Promise<void> {
  for (let index = 0; index < items.length; index += KV_PURGE_CONCURRENCY) {
    await Promise.all(items.slice(index, index + KV_PURGE_CONCURRENCY).map(run));
  }
}

/**
 * Panel KV writes carry no TTL, so link and bio page records keyed by this hostname would
 * outlive the domain row and resolve again for whichever workspace registers it next.
 */
async function purgeHostnameRecords(domain: DomainRow): Promise<void> {
  const db = getDb();
  const [linkRows, pageRows] = await Promise.all([
    db.select({ slug: links.slug }).from(links).where(eq(links.domainId, domain.id)),
    db.select({ handle: biopages.handle }).from(biopages).where(eq(biopages.domainId, domain.id)),
  ]);
  await inBatches(linkRows, (row) => deleteLinkRecord(domain.hostname, row.slug));
  await inBatches(pageRows, (row) => deleteBiopageRecord(domain.hostname, row.handle));
}

/**
 * Drops an unverified, empty claim so another account can register the hostname. Keeps
 * the CF hostname. Callers go through `claimReserved` first, so no links or bio pages of
 * the previous workspace are cascaded away.
 */
async function releaseUnverifiedClaim(row: DomainRow): Promise<void> {
  await purgeHostnameRecords(row);
  await getDb().delete(domains).where(eq(domains.id, row.id));
  await deleteDomainRecord(row.hostname);
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

  const existing = await getDomainByHostname(input.hostname);
  if (existing) {
    if (await claimReserved(existing, workspaceId)) {
      throw new Error("Domain already exists");
    }
    await releaseUnverifiedClaim(existing);
  }

  let cfHostnameId: string | null = null;
  let health: HostnameHealth | null = null;

  if (cloudflareEnabled()) {
    const record = await ensureCustomHostname(input.hostname);
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
  // The setup page polls this every few seconds; rewriting an unchanged record would
  // spend the KV write budget (1,000 a day on the free plan) on nothing.
  const record = toDomainKvRecord(updated);
  if (JSON.stringify(record) !== JSON.stringify(toDomainKvRecord(domain))) {
    await putDomainRecord(record);
  }

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

/** Hostnames that were checked this recently are left alone by the background refresh. */
const STALE_CHECK_MS = 2 * 60 * 1000;

/**
 * Re-reads Cloudflare for hostnames still in setup. Without it a domain only moved to
 * "live" while someone kept its setup page open, so the list (and the `domain.verified`
 * webhook) lagged until the next visit. Called from the domains list for one workspace;
 * safe to call from a cron without a workspace to sweep everything.
 */
export async function refreshPendingDomains(
  options: { workspaceId?: string; limit?: number } = {},
): Promise<number> {
  if (!cloudflareEnabled()) {
    return 0;
  }
  const cutoff = new Date(Date.now() - STALE_CHECK_MS);
  const filters = [
    eq(domains.isPlatform, false),
    inArray(domains.status, ["pending", "provisioning", "error"]),
    isNotNull(domains.cfHostnameId),
    or(isNull(domains.lastCheckedAt), lt(domains.lastCheckedAt, cutoff)),
  ];
  if (options.workspaceId) {
    filters.push(eq(domains.workspaceId, options.workspaceId));
  }
  const rows = await getDb()
    .select({ id: domains.id, workspaceId: domains.workspaceId })
    .from(domains)
    .where(and(...filters))
    .orderBy(asc(domains.lastCheckedAt))
    .limit(options.limit ?? 5);

  const results = await Promise.allSettled(rows.map((row) => refreshDomain(row.workspaceId, row.id)));
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("domain refresh failed", result.reason);
    }
  }
  return results.filter((result) => result.status === "fulfilled").length;
}

/** Removing the domain would drop these bio pages into the shared platform handle space. */
export class DomainHasBiopagesError extends Error {
  constructor(readonly biopageCount: number) {
    super("Move or delete the bio pages on this domain first");
    this.name = "DomainHasBiopagesError";
  }
}

export async function removeDomain(
  workspaceId: string,
  id: string,
  options: { dropBiopages?: boolean } = {},
): Promise<void> {
  const domain = await getDomain(workspaceId, id);
  if (!domain) {
    return;
  }
  if (domain.isPlatform) {
    throw new Error("The platform domain cannot be removed");
  }

  // `biopages.domain_id` is ON DELETE SET NULL, which would move these pages onto the
  // platform host: a handle squat around the vanity-handle gate, or a unique-index
  // violation. Ask the customer to deal with them unless the whole workspace is going.
  const [pages] = await getDb()
    .select({ value: count() })
    .from(biopages)
    .where(eq(biopages.domainId, domain.id));
  const pageCount = pages?.value ?? 0;
  if (pageCount > 0 && !options.dropBiopages) {
    throw new DomainHasBiopagesError(pageCount);
  }

  if (domain.cfHostnameId && cloudflareEnabled()) {
    try {
      await deleteCustomHostname(domain.cfHostnameId);
    } catch (error) {
      // A missing hostname on Cloudflare should not block the local cleanup.
      console.error("failed to delete custom hostname", error);
    }
  }

  await purgeHostnameRecords(domain);
  if (pageCount > 0) {
    await getDb().delete(biopages).where(eq(biopages.domainId, domain.id));
  }
  await getDb().delete(domains).where(eq(domains.id, id));
  await deleteDomainRecord(domain.hostname);
}

/**
 * Tears down everything a deleted workspace published to the edge: custom hostnames on
 * Cloudflare, their KV records, and the workspace's links and bio pages on the shared
 * platform hostname. The cascade on `organization` only cleans Postgres.
 */
export async function purgeWorkspaceEdgeRecords(workspaceId: string): Promise<void> {
  const db = getDb();
  const owned = await db
    .select({ id: domains.id })
    .from(domains)
    .where(and(eq(domains.workspaceId, workspaceId), eq(domains.isPlatform, false)));
  for (const row of owned) {
    await removeDomain(workspaceId, row.id, { dropBiopages: true });
  }

  const [linkRows, pageRows] = await Promise.all([
    db
      .select({ slug: links.slug, hostname: domains.hostname })
      .from(links)
      .innerJoin(domains, eq(links.domainId, domains.id))
      .where(eq(links.workspaceId, workspaceId)),
    db
      .select({ handle: biopages.handle, hostname: domains.hostname })
      .from(biopages)
      .leftJoin(domains, eq(biopages.domainId, domains.id))
      .where(eq(biopages.workspaceId, workspaceId)),
  ]);
  await inBatches(linkRows, (row) => deleteLinkRecord(row.hostname, row.slug));
  const platform = platformHostname();
  await inBatches(pageRows, (row) => deleteBiopageRecord(row.hostname ?? platform, row.handle));
}

export function cnameTarget(): string {
  return serverEnv().CUSTOM_HOSTNAME_TARGET;
}

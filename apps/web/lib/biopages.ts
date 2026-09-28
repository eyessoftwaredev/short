import {
  KV_SCHEMA_VERSION,
  parseStoredBioBlock,
  hashGatePassword,
  isBiopageLive,
  isPlatformRequestHost,
  platformHostAliases,
  sanitizeBioCss,
  scheduleInstant,
  scheduleMillis,
  type BioBlock,
  type BiopageInput,
  type BiopageKvRecord,
} from "@short/core";
import {
  and,
  asc,
  bioBlocks,
  bioLeads,
  biopages,
  count,
  desc,
  domains,
  eq,
  getDb,
  inArray,
  isNull,
  member,
  normalizePlatformHostname,
  or,
  plans,
  subscriptions,
  type BioBlockRow,
  type BioLeadRow,
  type BiopageRow,
} from "@short/db";
import { serverEnv } from "./env";
import { deleteBiopageRecord, putBiopageRecord } from "./kv";

export type BiopageWithBlocks = BiopageRow & {
  hostname: string;
  blocks: BioBlock[];
};

export type BiopageListRow = BiopageRow & { hostname: string; blockCount: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PLATFORM_SHORT_DOMAIN carries a port in local development (`localhost:3200`) while a
 * request's hostname never does, so the port has to go before the two are compared.
 */
export function platformHostname(): string {
  return normalizePlatformHostname(serverEnv().PLATFORM_SHORT_DOMAIN).split(":")[0] ?? "";
}

export function isPlatformBioHost(hostname: string): boolean {
  return isPlatformRequestHost(hostname, platformHostname());
}

export async function findPlatformDomain(hostname?: string) {
  const aliases = platformHostAliases(hostname ?? platformHostname());
  if (aliases.length === 0) {
    return null;
  }
  const rows = await getDb()
    .select()
    .from(domains)
    .where(or(...aliases.map((alias) => eq(domains.hostname, alias))));
  return rows.find((row) => row.isPlatform) ?? rows[0] ?? null;
}

export async function findDomainForHost(hostname: string) {
  const host = hostname.toLowerCase();
  const [exact] = await getDb().select().from(domains).where(eq(domains.hostname, host)).limit(1);
  if (exact) {
    return exact;
  }
  if (!isPlatformBioHost(host)) {
    return null;
  }
  return findPlatformDomain();
}

export async function findBiopageForHost(hostname: string, handle: string): Promise<BiopageRow | null> {
  const db = getDb();
  const normalized = handle.toLowerCase();
  const host = hostname.toLowerCase();

  if (isPlatformBioHost(host)) {
    const aliases = platformHostAliases(platformHostname());
    const platformDomains = await db
      .select({ id: domains.id })
      .from(domains)
      .where(or(...aliases.map((alias) => eq(domains.hostname, alias))));
    const ids = platformDomains.map((row) => row.id);
    const domainFilter =
      ids.length > 0 ? or(isNull(biopages.domainId), inArray(biopages.domainId, ids)) : isNull(biopages.domainId);
    const [row] = await db
      .select()
      .from(biopages)
      .where(and(eq(biopages.handle, normalized), domainFilter))
      .limit(1);
    if (row) {
      return row;
    }

    // Stale or mismatched domainId still has to resolve on the public short domain.
    const matches = await db
      .select()
      .from(biopages)
      .where(eq(biopages.handle, normalized))
      .limit(5);
    return matches.find((match) => match.published) ?? matches[0] ?? null;
  }

  const [row] = await db
    .select({ page: biopages })
    .from(biopages)
    .innerJoin(domains, eq(biopages.domainId, domains.id))
    .where(and(eq(biopages.handle, normalized), eq(domains.hostname, host)))
    .limit(1);
  return row?.page ?? null;
}

export async function healEpochSchedule(page: BiopageRow): Promise<BiopageRow> {
  const publishAt = scheduleInstant(page.publishAt);
  const unpublishAt = scheduleInstant(page.unpublishAt);
  const publishWasJunk = page.publishAt != null && publishAt === null;
  const unpublishWasJunk = page.unpublishAt != null && unpublishAt === null;
  if (!publishWasJunk && !unpublishWasJunk) {
    return page;
  }

  const [row] = await getDb()
    .update(biopages)
    .set({ publishAt, unpublishAt, updatedAt: new Date() })
    .where(eq(biopages.id, page.id))
    .returning();
  const next = row ?? { ...page, publishAt, unpublishAt };
  await putBiopageRecord(await resolveHostname(next.domainId), toKvRecord(next));
  return next;
}

export function toKvRecord(page: BiopageRow): BiopageKvRecord {
  return {
    v: KV_SCHEMA_VERSION,
    id: page.id,
    workspaceId: page.workspaceId,
    handle: page.handle,
    published: page.published,
    publishAt: scheduleMillis(page.publishAt),
    unpublishAt: scheduleMillis(page.unpublishAt),
    passwordHash: page.passwordHash,
  };
}

/** Blocks are stored one row each; the JSON config already carries its own position. */
function orderBlocks(rows: BioBlockRow[]): BioBlock[] {
  return rows
    .slice()
    .sort((a, b) => a.position - b.position)
    .flatMap((row, index) => {
      const parsed = parseStoredBioBlock({
        ...row.config,
        id: row.id,
        position: index,
        visible: row.visible,
      });
      return parsed ? [parsed] : [];
    });
}

function chromeFields(input: BiopageInput) {
  return {
    templateId: input.templateId,
    bgType: input.bgType,
    bgColor: input.bgColor,
    bgGradient: input.bgGradient,
    bgImageUrl: input.bgImageUrl,
    buttonColor: input.buttonColor,
    buttonTextColor: input.buttonTextColor,
    textColor: input.textColor,
    fontFamily: input.fontFamily,
    profileMode: input.profileMode,
    logoUrl: input.logoUrl,
    profileText: input.profileText ?? "",
    coverUrl: input.coverUrl,
    ogImageUrl: input.ogImageUrl,
    adsEnabled: input.adsEnabled,
    adMobileImage: input.adMobileImage,
    adMobileHref: input.adMobileHref,
    adLeftImage: input.adLeftImage,
    adLeftHref: input.adLeftHref,
    adRightImage: input.adRightImage,
    adRightHref: input.adRightHref,
    customCss: sanitizeBioCss(input.customCss ?? ""),
    sensitive: input.sensitive,
    publishAt: scheduleInstant(input.publishAt),
    unpublishAt: scheduleInstant(input.unpublishAt),
  };
}

async function nextPasswordHash(
  previous: string | null | undefined,
  input: BiopageInput,
): Promise<string | null> {
  if (input.removePassword) {
    return null;
  }
  if (input.password) {
    return hashGatePassword(input.password);
  }
  return previous ?? null;
}

async function resolveHostname(domainId: string | null): Promise<string> {
  if (!domainId) {
    return platformHostname();
  }
  const [row] = await getDb()
    .select({ hostname: domains.hostname })
    .from(domains)
    .where(eq(domains.id, domainId))
    .limit(1);
  return normalizePlatformHostname(row?.hostname ?? platformHostname()).split(":")[0] ?? platformHostname();
}

/**
 * A bio page lives on the shared platform host (`null`) or on one of the workspace's own
 * domains. `undefined` means the id points at another workspace's domain or nothing.
 */
export async function resolveBiopageDomainId(
  workspaceId: string,
  domainId: string | null,
): Promise<string | null | undefined> {
  if (!domainId) {
    return null;
  }
  if (!UUID.test(domainId)) {
    return undefined;
  }
  const [row] = await getDb()
    .select({ id: domains.id, workspaceId: domains.workspaceId, isPlatform: domains.isPlatform })
    .from(domains)
    .where(eq(domains.id, domainId))
    .limit(1);
  if (!row) {
    return undefined;
  }
  if (row.isPlatform) {
    return null;
  }
  return row.workspaceId === workspaceId ? row.id : undefined;
}

export function bioUrl(hostname: string, handle: string): string {
  return `https://${hostname}/${handle}`;
}

export async function listBiopages(
  workspaceId: string,
  page = 1,
  pageSize = 24,
): Promise<{ items: BiopageListRow[]; total: number }> {
  const db = getDb();
  const where = eq(biopages.workspaceId, workspaceId);
  const platform = serverEnv().PLATFORM_SHORT_DOMAIN;

  const [rows, totals] = await Promise.all([
    db
      .select({ page: biopages, hostname: domains.hostname })
      .from(biopages)
      .leftJoin(domains, eq(biopages.domainId, domains.id))
      .where(where)
      .orderBy(desc(biopages.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ value: count() }).from(biopages).where(where),
  ]);

  if (rows.length === 0) {
    return { items: [], total: totals[0]?.value ?? 0 };
  }

  const counts = await db
    .select({ biopageId: bioBlocks.biopageId, value: count() })
    .from(bioBlocks)
    .where(
      inArray(
        bioBlocks.biopageId,
        rows.map((row) => row.page.id),
      ),
    )
    .groupBy(bioBlocks.biopageId);

  const byPage = new Map(counts.map((row) => [row.biopageId, row.value]));

  return {
    items: rows.map((row) => ({
      ...row.page,
      hostname: row.hostname ?? platform,
      blockCount: byPage.get(row.page.id) ?? 0,
    })),
    total: totals[0]?.value ?? 0,
  };
}

export async function getBiopage(
  workspaceId: string,
  id: string,
): Promise<BiopageWithBlocks | null> {
  // The column is a uuid, so a hand-typed id would fail the cast in Postgres instead of
  // reaching the caller's "not found" branch.
  if (!UUID.test(id)) {
    return null;
  }

  const db = getDb();
  const [row] = await db
    .select({ page: biopages, hostname: domains.hostname })
    .from(biopages)
    .leftJoin(domains, eq(biopages.domainId, domains.id))
    .where(and(eq(biopages.workspaceId, workspaceId), eq(biopages.id, id)))
    .limit(1);

  if (!row) {
    return null;
  }

  const page = await healEpochSchedule(row.page);
  const blocks = await db
    .select()
    .from(bioBlocks)
    .where(eq(bioBlocks.biopageId, id))
    .orderBy(asc(bioBlocks.position));

  return {
    ...page,
    hostname: row.hostname ?? serverEnv().PLATFORM_SHORT_DOMAIN,
    blocks: orderBlocks(blocks),
  };
}

/** Public renderer entry point: resolves by hostname + handle, published pages only. */
export async function getPublishedBiopage(
  hostname: string,
  handle: string,
): Promise<(BiopageWithBlocks & { removeBranding: boolean }) | null> {
  const host = hostname.toLowerCase();
  const found = await findBiopageForHost(host, handle);
  if (!found) {
    return null;
  }
  const page = await healEpochSchedule(found);
  if (!isBiopageLive(page)) {
    return null;
  }

  const [blocks, removeBranding] = await Promise.all([
    getDb()
      .select()
      .from(bioBlocks)
      .where(and(eq(bioBlocks.biopageId, page.id), eq(bioBlocks.visible, true)))
      .orderBy(asc(bioBlocks.position)),
    brandingRemoved(page.workspaceId),
  ]);

  return { ...page, hostname: host, blocks: orderBlocks(blocks), removeBranding };
}

/** Paid plans hide the "Powered by" footer on public bio pages. */
async function brandingRemoved(workspaceId: string): Promise<boolean> {
  const [owner] = await getDb()
    .select({ userId: member.userId })
    .from(member)
    .where(and(eq(member.organizationId, workspaceId), eq(member.role, "owner")))
    .limit(1);
  if (!owner) {
    return false;
  }

  const [row] = await getDb()
    .select({ features: plans.features })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planKey, plans.key))
    .where(eq(subscriptions.userId, owner.userId))
    .limit(1);

  return row?.features.removeBranding ?? false;
}

/**
 * Rewrites a page's blocks in one transaction, so a failed insert can never leave the
 * page empty. Block ids are kept: click events and leads are keyed by block id, and a
 * fresh id on every save would orphan the per-block stats and lead attribution.
 */
async function replaceBlocks(biopageId: string, blocks: BioBlock[]): Promise<void> {
  const seen = new Set<string>();
  const rows = blocks.map((block, index) => {
    // Only a well-formed, unique uuid is reused; anything else gets a fresh one.
    const keep = UUID.test(block.id) && !seen.has(block.id.toLowerCase());
    const id = keep ? block.id.toLowerCase() : crypto.randomUUID();
    seen.add(id);
    return {
      id,
      biopageId,
      type: block.type,
      position: index,
      visible: block.visible,
      config: { ...block, id, position: index },
    };
  });

  await getDb().transaction(async (tx) => {
    await tx.delete(bioBlocks).where(eq(bioBlocks.biopageId, biopageId));
    if (rows.length > 0) {
      await tx.insert(bioBlocks).values(rows);
    }
  });
}

/**
 * Every writer goes through here, so a page can never land on another workspace's
 * domain. Platform-hosted pages are always stored with a NULL domain.
 */
async function storedDomainId(workspaceId: string, domainId: string | null): Promise<string | null> {
  const resolved = await resolveBiopageDomainId(workspaceId, domainId);
  if (resolved === undefined) {
    throw new Error("Domain not found");
  }
  return resolved;
}

export async function createBiopage(
  workspaceId: string,
  input: BiopageInput,
): Promise<BiopageRow> {
  const db = getDb();
  const [row] = await db
    .insert(biopages)
    .values({
      workspaceId,
      domainId: await storedDomainId(workspaceId, input.domainId),
      handle: input.handle,
      displayName: input.displayName,
      bio: input.bio,
      avatarUrl: input.avatarUrl,
      theme: input.theme,
      buttonStyle: input.buttonStyle,
      ...chromeFields(input),
      passwordHash: await nextPasswordHash(null, input),
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      published: input.published,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create bio page");
  }

  await replaceBlocks(row.id, input.blocks);
  await putBiopageRecord(await resolveHostname(row.domainId), toKvRecord(row));
  return row;
}

export async function updateBiopage(
  workspaceId: string,
  id: string,
  input: BiopageInput,
): Promise<BiopageRow> {
  const db = getDb();
  const [previous] = await db
    .select()
    .from(biopages)
    .where(and(eq(biopages.workspaceId, workspaceId), eq(biopages.id, id)))
    .limit(1);

  if (!previous) {
    throw new Error("Bio page not found");
  }

  const [row] = await db
    .update(biopages)
    .set({
      domainId: await storedDomainId(workspaceId, input.domainId),
      handle: input.handle,
      displayName: input.displayName,
      bio: input.bio,
      avatarUrl: input.avatarUrl,
      theme: input.theme,
      buttonStyle: input.buttonStyle,
      ...chromeFields(input),
      passwordHash: await nextPasswordHash(previous.passwordHash, input),
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      published: input.published,
      updatedAt: new Date(),
    })
    .where(and(eq(biopages.workspaceId, workspaceId), eq(biopages.id, id)))
    .returning();

  if (!row) {
    throw new Error("Bio page not found");
  }

  await replaceBlocks(row.id, input.blocks);

  // A moved handle or domain leaves a stale KV key behind, so drop it first.
  const previousHostname = await resolveHostname(previous.domainId);
  const hostname = await resolveHostname(row.domainId);
  if (previousHostname !== hostname || previous.handle !== row.handle) {
    await deleteBiopageRecord(previousHostname, previous.handle);
  }
  await putBiopageRecord(hostname, toKvRecord(row));

  return row;
}

export async function setBiopagePublished(
  workspaceId: string,
  id: string,
  published: boolean,
): Promise<BiopageRow> {
  const db = getDb();
  const [row] = await db
    .update(biopages)
    .set({
      published,
      updatedAt: new Date(),
      // The switch means "live now". A leftover future window would still 404.
      ...(published ? { publishAt: null, unpublishAt: null } : {}),
    })
    .where(and(eq(biopages.workspaceId, workspaceId), eq(biopages.id, id)))
    .returning();

  if (!row) {
    throw new Error("Bio page not found");
  }

  await putBiopageRecord(await resolveHostname(row.domainId), toKvRecord(row));
  return row;
}

export async function deleteBiopage(workspaceId: string, id: string): Promise<void> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(biopages)
    .where(and(eq(biopages.workspaceId, workspaceId), eq(biopages.id, id)))
    .limit(1);

  if (!row) {
    return;
  }

  await db.delete(biopages).where(eq(biopages.id, id));
  await deleteBiopageRecord(await resolveHostname(row.domainId), row.handle);
}

export async function handleTaken(
  handle: string,
  domainId: string | null,
  exceptId?: string,
): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: biopages.id, domainId: biopages.domainId, isPlatform: domains.isPlatform })
    .from(biopages)
    .leftJoin(domains, eq(biopages.domainId, domains.id))
    .where(eq(biopages.handle, handle.toLowerCase()))
    .limit(20);

  // Platform pages are stored as NULL, but older rows may carry the platform domain's id;
  // both serve on the same public host, so they share one handle namespace.
  let wanted = domainId;
  if (domainId && UUID.test(domainId)) {
    const [target] = await db
      .select({ isPlatform: domains.isPlatform })
      .from(domains)
      .where(eq(domains.id, domainId))
      .limit(1);
    if (target?.isPlatform) {
      wanted = null;
    }
  }
  return rows.some(
    (row) => (row.domainId && !row.isPlatform ? row.domainId : null) === wanted && row.id !== exceptId,
  );
}

export async function getLiveBiopageById(id: string): Promise<BiopageWithBlocks | null> {
  if (!UUID.test(id)) {
    return null;
  }
  const db = getDb();
  const [row] = await db.select().from(biopages).where(eq(biopages.id, id)).limit(1);
  if (!row || !isBiopageLive(row)) {
    return null;
  }
  const blocks = await db
    .select()
    .from(bioBlocks)
    .where(and(eq(bioBlocks.biopageId, id), eq(bioBlocks.visible, true)))
    .orderBy(asc(bioBlocks.position));
  return {
    ...row,
    hostname: await resolveHostname(row.domainId),
    blocks: orderBlocks(blocks),
  };
}

export async function createBioLead(input: {
  biopageId: string;
  blockId: string;
  email: string;
  payload?: Record<string, string>;
  ipHash?: string | null;
}): Promise<BioLeadRow> {
  const [row] = await getDb()
    .insert(bioLeads)
    .values({
      biopageId: input.biopageId,
      blockId: input.blockId,
      email: input.email,
      payload: input.payload ?? {},
      ipHash: input.ipHash ?? null,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to store lead");
  }
  return row;
}

/** A visitor who submits the same address twice is one lead, not two. */
export async function bioLeadExists(biopageId: string, email: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: bioLeads.id })
    .from(bioLeads)
    .where(and(eq(bioLeads.biopageId, biopageId), eq(bioLeads.email, email)))
    .limit(1);
  return Boolean(row);
}

export async function listBioLeads(
  workspaceId: string,
  biopageId: string,
): Promise<BioLeadRow[]> {
  const page = await getBiopage(workspaceId, biopageId);
  if (!page) {
    return [];
  }
  return getDb()
    .select()
    .from(bioLeads)
    .where(eq(bioLeads.biopageId, biopageId))
    .orderBy(desc(bioLeads.createdAt))
    .limit(500);
}

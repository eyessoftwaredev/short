import {
  KV_SCHEMA_VERSION,
  type BioBlock,
  type BiopageInput,
  type BiopageKvRecord,
} from "@short/core";
import {
  and,
  asc,
  bioBlocks,
  biopages,
  count,
  desc,
  domains,
  eq,
  getDb,
  inArray,
  isNull,
  plans,
  subscriptions,
  type BioBlockRow,
  type BiopageRow,
} from "@short/db";
import { serverEnv } from "./env";
import { deleteBiopageRecord, putBiopageRecord } from "./kv";

export type BiopageWithBlocks = BiopageRow & {
  hostname: string;
  blocks: BioBlock[];
};

export type BiopageListRow = BiopageRow & { hostname: string; blockCount: number };

function toKvRecord(page: BiopageRow): BiopageKvRecord {
  return {
    v: KV_SCHEMA_VERSION,
    id: page.id,
    workspaceId: page.workspaceId,
    handle: page.handle,
    published: page.published,
  };
}

/** Blocks are stored one row each; the JSON config already carries its own position. */
function orderBlocks(rows: BioBlockRow[]): BioBlock[] {
  return rows
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((row, index) => ({ ...row.config, id: row.id, position: index }) as BioBlock);
}

async function resolveHostname(domainId: string | null): Promise<string> {
  if (!domainId) {
    return serverEnv().PLATFORM_SHORT_DOMAIN;
  }
  const [row] = await getDb()
    .select({ hostname: domains.hostname })
    .from(domains)
    .where(eq(domains.id, domainId))
    .limit(1);
  return row?.hostname ?? serverEnv().PLATFORM_SHORT_DOMAIN;
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

  const blocks = await db
    .select()
    .from(bioBlocks)
    .where(eq(bioBlocks.biopageId, id))
    .orderBy(asc(bioBlocks.position));

  return {
    ...row.page,
    hostname: row.hostname ?? serverEnv().PLATFORM_SHORT_DOMAIN,
    blocks: orderBlocks(blocks),
  };
}

/** Public renderer entry point: resolves by hostname + handle, published pages only. */
export async function getPublishedBiopage(
  hostname: string,
  handle: string,
): Promise<(BiopageWithBlocks & { removeBranding: boolean }) | null> {
  const db = getDb();
  const normalized = handle.toLowerCase();
  const host = hostname.toLowerCase();
  const isPlatformHost = host === serverEnv().PLATFORM_SHORT_DOMAIN.toLowerCase();

  // A null `domain_id` means the page is served from the platform domain, so the two
  // cases need different joins rather than one filtered afterwards.
  const [row] = isPlatformHost
    ? await db
        .select({ page: biopages })
        .from(biopages)
        .where(
          and(
            eq(biopages.handle, normalized),
            eq(biopages.published, true),
            isNull(biopages.domainId),
          ),
        )
        .limit(1)
    : await db
        .select({ page: biopages })
        .from(biopages)
        .innerJoin(domains, eq(biopages.domainId, domains.id))
        .where(
          and(
            eq(biopages.handle, normalized),
            eq(biopages.published, true),
            eq(domains.hostname, host),
          ),
        )
        .limit(1);

  if (!row) {
    return null;
  }

  const [blocks, removeBranding] = await Promise.all([
    db
      .select()
      .from(bioBlocks)
      .where(and(eq(bioBlocks.biopageId, row.page.id), eq(bioBlocks.visible, true)))
      .orderBy(asc(bioBlocks.position)),
    brandingRemoved(row.page.workspaceId),
  ]);

  return { ...row.page, hostname: host, blocks: orderBlocks(blocks), removeBranding };
}

/** Paid plans hide the "Powered by" footer on public bio pages. */
async function brandingRemoved(workspaceId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ features: plans.features })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planKey, plans.key))
    .where(eq(subscriptions.workspaceId, workspaceId))
    .limit(1);

  return row?.features.removeBranding ?? false;
}

async function replaceBlocks(biopageId: string, blocks: BioBlock[]): Promise<void> {
  const db = getDb();
  await db.delete(bioBlocks).where(eq(bioBlocks.biopageId, biopageId));

  if (blocks.length === 0) {
    return;
  }

  await db.insert(bioBlocks).values(
    blocks.map((block, index) => ({
      biopageId,
      type: block.type,
      position: index,
      visible: block.visible,
      config: { ...block, position: index },
    })),
  );
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
      domainId: input.domainId,
      handle: input.handle,
      displayName: input.displayName,
      bio: input.bio,
      avatarUrl: input.avatarUrl,
      theme: input.theme,
      buttonStyle: input.buttonStyle,
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
      domainId: input.domainId,
      handle: input.handle,
      displayName: input.displayName,
      bio: input.bio,
      avatarUrl: input.avatarUrl,
      theme: input.theme,
      buttonStyle: input.buttonStyle,
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
    .select({ id: biopages.id, domainId: biopages.domainId })
    .from(biopages)
    .where(eq(biopages.handle, handle.toLowerCase()))
    .limit(20);

  return rows.some((row) => row.domainId === domainId && row.id !== exceptId);
}

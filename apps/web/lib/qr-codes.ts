import type { QrInput, QrStyle } from "@short/core";
import {
  and,
  count,
  desc,
  domains,
  eq,
  getDb,
  links,
  qrCodes,
  type QrCodeRow,
} from "@short/db";
import { shortUrl } from "./links";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type QrCodeWithTarget = QrCodeRow & {
  hostname: string;
  slug: string;
  destination: string;
  linkArchived: boolean;
};

function selection() {
  return {
    id: qrCodes.id,
    workspaceId: qrCodes.workspaceId,
    linkId: qrCodes.linkId,
    name: qrCodes.name,
    style: qrCodes.style,
    createdAt: qrCodes.createdAt,
    updatedAt: qrCodes.updatedAt,
    hostname: domains.hostname,
    slug: links.slug,
    destination: links.destination,
    linkArchived: links.archived,
  };
}

export async function listQrCodes(
  workspaceId: string,
  page = 1,
  pageSize = 24,
): Promise<{ items: QrCodeWithTarget[]; total: number }> {
  const db = getDb();
  const where = eq(qrCodes.workspaceId, workspaceId);

  const [items, totals] = await Promise.all([
    db
      .select(selection())
      .from(qrCodes)
      .innerJoin(links, eq(qrCodes.linkId, links.id))
      .innerJoin(domains, eq(links.domainId, domains.id))
      .where(where)
      .orderBy(desc(qrCodes.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ value: count() }).from(qrCodes).where(where),
  ]);

  return { items, total: totals[0]?.value ?? 0 };
}

export async function getQrCode(
  workspaceId: string,
  id: string,
): Promise<QrCodeWithTarget | null> {
  // The column is a uuid, so a hand-typed id would fail the cast in Postgres instead of
  // reaching the caller's "not found" branch.
  if (!UUID.test(id)) {
    return null;
  }

  const db = getDb();
  const [row] = await db
    .select(selection())
    .from(qrCodes)
    .innerJoin(links, eq(qrCodes.linkId, links.id))
    .innerJoin(domains, eq(links.domainId, domains.id))
    .where(and(eq(qrCodes.workspaceId, workspaceId), eq(qrCodes.id, id)))
    .limit(1);

  return row ?? null;
}

/** Guards against attaching a QR code to a link from another workspace. */
export async function assertLinkInWorkspace(workspaceId: string, linkId: string): Promise<void> {
  const db = getDb();
  const [row] = await db
    .select({ id: links.id })
    .from(links)
    .where(and(eq(links.workspaceId, workspaceId), eq(links.id, linkId)))
    .limit(1);

  if (!row) {
    throw new Error("Link not found in this workspace");
  }
}

export async function createQrCode(workspaceId: string, input: QrInput): Promise<QrCodeRow> {
  await assertLinkInWorkspace(workspaceId, input.linkId);

  const [row] = await getDb()
    .insert(qrCodes)
    .values({
      workspaceId,
      linkId: input.linkId,
      name: input.name,
      style: input.style,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create QR code");
  }
  return row;
}

export async function updateQrCode(
  workspaceId: string,
  id: string,
  input: QrInput,
): Promise<QrCodeRow> {
  await assertLinkInWorkspace(workspaceId, input.linkId);

  const [row] = await getDb()
    .update(qrCodes)
    .set({
      linkId: input.linkId,
      name: input.name,
      style: input.style,
      updatedAt: new Date(),
    })
    .where(and(eq(qrCodes.workspaceId, workspaceId), eq(qrCodes.id, id)))
    .returning();

  if (!row) {
    throw new Error("QR code not found");
  }
  return row;
}

export async function deleteQrCode(workspaceId: string, id: string): Promise<void> {
  await getDb()
    .delete(qrCodes)
    .where(and(eq(qrCodes.workspaceId, workspaceId), eq(qrCodes.id, id)));
}

/**
 * The encoded payload is always the short URL, never the destination — that is what
 * makes a printed QR code re-targetable by editing the link. The `?qr=` marker is
 * stripped by the worker before the redirect and turns the event into a `qr_scan`.
 */
export function qrPayload(row: Pick<QrCodeWithTarget, "hostname" | "slug" | "id">): string {
  return `${shortUrl(row.hostname, row.slug)}?qr=${row.id}`;
}

export type { QrStyle };

import type { QrInput, QrPayloadKind, QrStyle } from "@short/core";
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
    payloadKind: qrCodes.payloadKind,
    payload: qrCodes.payload,
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
      .leftJoin(links, eq(qrCodes.linkId, links.id))
      .leftJoin(domains, eq(links.domainId, domains.id))
      .where(where)
      .orderBy(desc(qrCodes.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ value: count() }).from(qrCodes).where(where),
  ]);

  return {
    items: items.map(normalizeQrRow),
    total: totals[0]?.value ?? 0,
  };
}

export async function getQrCode(
  workspaceId: string,
  id: string,
): Promise<QrCodeWithTarget | null> {
  if (!UUID.test(id)) {
    return null;
  }

  const db = getDb();
  const [row] = await db
    .select(selection())
    .from(qrCodes)
    .leftJoin(links, eq(qrCodes.linkId, links.id))
    .leftJoin(domains, eq(links.domainId, domains.id))
    .where(and(eq(qrCodes.workspaceId, workspaceId), eq(qrCodes.id, id)))
    .limit(1);

  return row ? normalizeQrRow(row) : null;
}

function normalizeQrRow(row: {
  id: string;
  workspaceId: string;
  linkId: string | null;
  payloadKind: QrPayloadKind;
  payload: string | null;
  name: string;
  style: QrStyle;
  createdAt: Date;
  updatedAt: Date;
  hostname: string | null;
  slug: string | null;
  destination: string | null;
  linkArchived: boolean | null;
}): QrCodeWithTarget {
  return {
    ...row,
    hostname: row.hostname ?? "",
    slug: row.slug ?? "",
    destination: row.destination ?? "",
    linkArchived: row.linkArchived ?? false,
  };
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
  if (input.payloadKind === "link" && input.linkId) {
    await assertLinkInWorkspace(workspaceId, input.linkId);
  }

  const [row] = await getDb()
    .insert(qrCodes)
    .values({
      workspaceId,
      linkId: input.payloadKind === "link" ? input.linkId : null,
      payloadKind: input.payloadKind,
      payload: input.payload,
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
  if (input.payloadKind === "link" && input.linkId) {
    await assertLinkInWorkspace(workspaceId, input.linkId);
  }

  const [row] = await getDb()
    .update(qrCodes)
    .set({
      linkId: input.payloadKind === "link" ? input.linkId : null,
      payloadKind: input.payloadKind,
      payload: input.payload,
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
 * Short-link QR encodes the short URL plus `?qr=` so scans become `qr_scan` events.
 * Standalone kinds encode the raw payload and are not re-targetable.
 */
export function qrPayload(
  row: Pick<QrCodeWithTarget, "hostname" | "slug" | "id" | "payloadKind" | "payload">,
): string {
  if (row.payloadKind !== "link") {
    return row.payload ?? "";
  }
  return `${shortUrl(row.hostname, row.slug)}?qr=${row.id}`;
}

export type { QrStyle };

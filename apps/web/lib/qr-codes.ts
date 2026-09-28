import { getBreakdown } from "@short/analytics";
import { QR_PAYLOAD_KINDS, type QrInput, type QrPayloadKind, type QrStyle } from "@short/core";
import {
  and,
  count,
  desc,
  domains,
  eq,
  getDb,
  ilike,
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

export type QrCodeFilter = {
  /** Only codes that encode this short link (the link editor's "all QR codes" view). */
  linkId?: string | null;
  /** Only codes of this content type. */
  kind?: QrPayloadKind | null;
  /** Case-insensitive match on the code's name. */
  search?: string | null;
};

export function parseQrKind(value: string | null | undefined): QrPayloadKind | null {
  return QR_PAYLOAD_KINDS.includes(value as QrPayloadKind) ? (value as QrPayloadKind) : null;
}

/** Workspace scope plus the optional link filter, shared by the list and the counts. */
function scopeFilters(workspaceId: string, filter: QrCodeFilter) {
  const linkId = filter.linkId && UUID.test(filter.linkId) ? filter.linkId : null;
  return linkId
    ? [eq(qrCodes.workspaceId, workspaceId), eq(qrCodes.linkId, linkId)]
    : [eq(qrCodes.workspaceId, workspaceId)];
}

export async function listQrCodes(
  workspaceId: string,
  page = 1,
  pageSize = 24,
  filter: QrCodeFilter = {},
): Promise<{ items: QrCodeWithTarget[]; total: number }> {
  const db = getDb();
  const filters = scopeFilters(workspaceId, filter);
  const kind = parseQrKind(filter.kind);
  if (kind) {
    filters.push(eq(qrCodes.payloadKind, kind));
  }
  const search = filter.search?.trim().slice(0, 120);
  if (search) {
    // `%` and `_` typed by the user are literals, not ILIKE wildcards.
    filters.push(ilike(qrCodes.name, `%${search.replace(/[\\%_]/g, "\\$&")}%`));
  }
  const where = and(...filters);

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

/** How many codes of each content type, for the list's filter chips. */
export async function countQrCodesByKind(
  workspaceId: string,
  filter: Pick<QrCodeFilter, "linkId"> = {},
): Promise<Record<QrPayloadKind, number>> {
  const rows = await getDb()
    .select({ kind: qrCodes.payloadKind, value: count() })
    .from(qrCodes)
    .where(and(...scopeFilters(workspaceId, filter)))
    .groupBy(qrCodes.payloadKind);
  const counts = Object.fromEntries(QR_PAYLOAD_KINDS.map((kind) => [kind, 0])) as Record<
    QrPayloadKind,
    number
  >;
  for (const row of rows) {
    if (row.kind in counts) {
      counts[row.kind] = row.value;
    }
  }
  return counts;
}

/**
 * The newest code that encodes a short link, plus how many there are in total, for the
 * link editor's QR card and the links table's "QR code" shortcut.
 */
export async function getLatestQrCodeForLink(
  workspaceId: string,
  linkId: string,
): Promise<{ latest: QrCodeWithTarget | null; total: number }> {
  if (!UUID.test(linkId)) {
    return { latest: null, total: 0 };
  }
  const { items, total } = await listQrCodes(workspaceId, 1, 1, { linkId });
  return { latest: items[0] ?? null, total };
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
  if (!UUID.test(id)) {
    throw new Error("QR code not found");
  }
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

/** Returns false when no such code exists in this workspace. */
export async function deleteQrCode(workspaceId: string, id: string): Promise<boolean> {
  if (!UUID.test(id)) {
    return false;
  }
  const deleted = await getDb()
    .delete(qrCodes)
    .where(and(eq(qrCodes.workspaceId, workspaceId), eq(qrCodes.id, id)))
    .returning({ id: qrCodes.id });
  return deleted.length > 0;
}

/** Window for the scan counts on the QR list cards. */
export const QR_SCAN_WINDOW_DAYS = 30;

/**
 * Human scans per QR code over the last `days`, keyed by code id. Codes without scans
 * are absent. `null` means ClickHouse could not be reached, which the list must not
 * show as "0 scans".
 */
export async function loadQrScanCounts(
  workspaceId: string,
  days = QR_SCAN_WINDOW_DAYS,
): Promise<Map<string, number> | null> {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  try {
    const rows = await getBreakdown({ workspaceId, from, to, eventType: "qr_scan" }, "qr", 1000);
    return new Map(rows.map((row) => [row.key, row.clicks]));
  } catch (error) {
    console.error("[qr] scan counts failed", error);
    return null;
  }
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

import {
  and,
  bioBlocks,
  biopages,
  count,
  desc,
  eq,
  getDb,
  links,
  or,
  qrCodes,
  qrTemplates,
  sql,
  workspaceMedia,
  type WorkspaceMediaRow,
} from "@short/db";

export const MEDIA_PATH = /^\/api\/media\/([0-9a-f-]{36})$/i;
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"] as const;
export const MAX_MEDIA_BYTES = 4 * 1024 * 1024;

export type MediaListItem = {
  id: string;
  url: string;
  contentType: string;
  filename: string | null;
  byteSize: number | null;
  createdAt: string;
};

export type UploadedMedia = {
  id: string;
  url: string;
  contentType: string;
};

export function mediaUrl(id: string): string {
  return `/api/media/${id}`;
}

export function parseMediaId(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const match = MEDIA_PATH.exec(value.trim());
  return match?.[1] ?? null;
}

export function isMediaPath(value: string | null | undefined): boolean {
  return parseMediaId(value) !== null;
}

export async function getWorkspaceMedia(
  workspaceId: string,
  id: string,
): Promise<WorkspaceMediaRow | null> {
  const [row] = await getDb()
    .select()
    .from(workspaceMedia)
    .where(and(eq(workspaceMedia.workspaceId, workspaceId), eq(workspaceMedia.id, id)))
    .limit(1);
  return row ?? null;
}

export async function getMediaById(id: string): Promise<WorkspaceMediaRow | null> {
  const [row] = await getDb().select().from(workspaceMedia).where(eq(workspaceMedia.id, id)).limit(1);
  return row ?? null;
}

export async function assertOwnedMedia(
  workspaceId: string,
  value: string | null | undefined,
): Promise<void> {
  const id = parseMediaId(value);
  if (!id) {
    if (value && value.trim() !== "") {
      throw new Error("Image must be an uploaded workspace file");
    }
    return;
  }
  const row = await getWorkspaceMedia(workspaceId, id);
  if (!row) {
    throw new Error("Image is not in this workspace");
  }
}

export function mediaToDataUri(row: Pick<WorkspaceMediaRow, "contentType" | "bytes">): string {
  return `data:${row.contentType};base64,${row.bytes.toString("base64")}`;
}

function sanitizeFilename(name: string): string {
  const base = name.trim().slice(0, 200);
  return base.replace(/[^\w.\-() ]+/g, "_") || "upload";
}

export async function uploadWorkspaceMedia(input: {
  workspaceId: string;
  uploadedBy: string;
  file: File;
}): Promise<UploadedMedia> {
  const { workspaceId, uploadedBy, file } = input;

  if (file.size === 0) {
    throw new Error("media_missing");
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new Error("media_type");
  }
  if (file.size > MAX_MEDIA_BYTES) {
    throw new Error("media_size");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const [row] = await getDb()
    .insert(workspaceMedia)
    .values({
      workspaceId,
      kind: "image",
      contentType: file.type,
      bytes,
      filename: sanitizeFilename(file.name),
      byteSize: file.size,
      uploadedBy,
    })
    .returning({ id: workspaceMedia.id, contentType: workspaceMedia.contentType });

  if (!row) {
    throw new Error("media_save");
  }

  return { id: row.id, url: mediaUrl(row.id), contentType: row.contentType };
}

export async function listWorkspaceMedia(
  workspaceId: string,
  page = 1,
  pageSize = 48,
): Promise<{ items: MediaListItem[]; total: number }> {
  const db = getDb();
  const where = eq(workspaceMedia.workspaceId, workspaceId);
  const offset = (page - 1) * pageSize;

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: workspaceMedia.id,
        contentType: workspaceMedia.contentType,
        filename: workspaceMedia.filename,
        byteSize: workspaceMedia.byteSize,
        createdAt: workspaceMedia.createdAt,
      })
      .from(workspaceMedia)
      .where(where)
      .orderBy(desc(workspaceMedia.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(workspaceMedia).where(where),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      url: mediaUrl(row.id),
      contentType: row.contentType,
      filename: row.filename,
      byteSize: row.byteSize,
      createdAt: row.createdAt.toISOString(),
    })),
    total: totals[0]?.value ?? 0,
  };
}

async function isMediaReferenced(workspaceId: string, mediaPath: string): Promise<boolean> {
  const db = getDb();
  const likePath = mediaPath;

  const checks = await Promise.all([
    db
      .select({ id: qrCodes.id })
      .from(qrCodes)
      .where(
        and(
          eq(qrCodes.workspaceId, workspaceId),
          sql`${qrCodes.style}->>'logoUrl' = ${likePath}`,
        ),
      )
      .limit(1),
    db
      .select({ id: qrTemplates.id })
      .from(qrTemplates)
      .where(
        and(
          eq(qrTemplates.workspaceId, workspaceId),
          sql`${qrTemplates.style}->>'logoUrl' = ${likePath}`,
        ),
      )
      .limit(1),
    db
      .select({ id: links.id })
      .from(links)
      .where(and(eq(links.workspaceId, workspaceId), eq(links.image, likePath)))
      .limit(1),
    db
      .select({ id: biopages.id })
      .from(biopages)
      .where(
        and(
          eq(biopages.workspaceId, workspaceId),
          or(
            eq(biopages.logoUrl, likePath),
            eq(biopages.coverUrl, likePath),
            eq(biopages.bgImageUrl, likePath),
            eq(biopages.ogImageUrl, likePath),
            eq(biopages.adMobileImage, likePath),
            eq(biopages.adLeftImage, likePath),
            eq(biopages.adRightImage, likePath),
            eq(biopages.avatarUrl, likePath),
          ),
        ),
      )
      .limit(1),
    db
      .select({ id: bioBlocks.id })
      .from(bioBlocks)
      .innerJoin(biopages, eq(bioBlocks.biopageId, biopages.id))
      .where(
        and(
          eq(biopages.workspaceId, workspaceId),
          sql`${bioBlocks.config}::text LIKE ${`%${likePath}%`}`,
        ),
      )
      .limit(1),
  ]);

  return checks.some((rows) => rows.length > 0);
}

export async function deleteWorkspaceMedia(
  workspaceId: string,
  id: string,
): Promise<{ deleted: true } | { deleted: false; reason: "not_found" | "in_use" }> {
  const row = await getWorkspaceMedia(workspaceId, id);
  if (!row) {
    return { deleted: false, reason: "not_found" };
  }

  const path = mediaUrl(id);
  if (await isMediaReferenced(workspaceId, path)) {
    return { deleted: false, reason: "in_use" };
  }

  await getDb()
    .delete(workspaceMedia)
    .where(and(eq(workspaceMedia.workspaceId, workspaceId), eq(workspaceMedia.id, id)));

  return { deleted: true };
}

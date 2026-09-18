import { and, eq, getDb, workspaceMedia, type WorkspaceMediaRow } from "@short/db";

export const MEDIA_PATH = /^\/api\/media\/([0-9a-f-]{36})$/i;
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"] as const;
export const MAX_MEDIA_BYTES = 4 * 1024 * 1024;

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

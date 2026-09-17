import { and, asc, eq, folders, getDb, type FolderRow } from "@short/db";

export async function listFolders(workspaceId: string): Promise<FolderRow[]> {
  return getDb()
    .select()
    .from(folders)
    .where(eq(folders.workspaceId, workspaceId))
    .orderBy(asc(folders.name));
}

export async function createFolder(workspaceId: string, name: string): Promise<FolderRow> {
  const [row] = await getDb()
    .insert(folders)
    .values({ workspaceId, name })
    .returning();
  if (!row) {
    throw new Error("Failed to create folder");
  }
  return row;
}

export async function renameFolder(
  workspaceId: string,
  id: string,
  name: string,
): Promise<FolderRow> {
  const [row] = await getDb()
    .update(folders)
    .set({ name })
    .where(and(eq(folders.workspaceId, workspaceId), eq(folders.id, id)))
    .returning();
  if (!row) {
    throw new Error("Folder not found");
  }
  return row;
}

export async function deleteFolder(workspaceId: string, id: string): Promise<void> {
  await getDb()
    .delete(folders)
    .where(and(eq(folders.workspaceId, workspaceId), eq(folders.id, id)));
}

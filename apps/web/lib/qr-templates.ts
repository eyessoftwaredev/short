import { qrTemplateInputSchema, type QrStyle, type QrTemplateInput } from "@short/core";
import { and, desc, eq, getDb, qrTemplates, type QrTemplateRow } from "@short/db";

export type QrTemplateView = {
  id: string;
  name: string;
  style: QrStyle;
  createdAt: string;
  updatedAt: string;
};

function toView(row: QrTemplateRow): QrTemplateView {
  return {
    id: row.id,
    name: row.name,
    style: row.style,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listQrTemplates(workspaceId: string): Promise<QrTemplateView[]> {
  const rows = await getDb()
    .select()
    .from(qrTemplates)
    .where(eq(qrTemplates.workspaceId, workspaceId))
    .orderBy(desc(qrTemplates.updatedAt));

  return rows.map(toView);
}

export async function createQrTemplate(
  workspaceId: string,
  createdBy: string,
  input: QrTemplateInput,
): Promise<QrTemplateView> {
  const parsed = qrTemplateInputSchema.parse(input);
  const [row] = await getDb()
    .insert(qrTemplates)
    .values({
      workspaceId,
      name: parsed.name,
      style: parsed.style,
      createdBy,
    })
    .returning();

  if (!row) {
    throw new Error("template_save");
  }

  return toView(row);
}

export async function deleteQrTemplate(workspaceId: string, id: string): Promise<boolean> {
  const result = await getDb()
    .delete(qrTemplates)
    .where(and(eq(qrTemplates.workspaceId, workspaceId), eq(qrTemplates.id, id)))
    .returning({ id: qrTemplates.id });

  return result.length > 0;
}

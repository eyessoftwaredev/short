import { qrTemplateInputSchema, type QrStyle, type QrTemplateInput } from "@short/core";
import { and, desc, eq, getDb, qrTemplates, type QrTemplateRow } from "@short/db";
import { parseWithQrLogoPreset } from "./qr-logo-presets";

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
  const parsed = parseWithQrLogoPreset(input.style.logoUrl, (logoUrl) =>
    qrTemplateInputSchema.parse({ ...input, style: { ...input.style, logoUrl } }),
  );
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function deleteQrTemplate(workspaceId: string, id: string): Promise<boolean> {
  // Postgres throws on a malformed uuid; that is a plain "not found", not a crash.
  if (!UUID.test(id)) {
    return false;
  }
  const result = await getDb()
    .delete(qrTemplates)
    .where(and(eq(qrTemplates.workspaceId, workspaceId), eq(qrTemplates.id, id)))
    .returning({ id: qrTemplates.id });

  return result.length > 0;
}

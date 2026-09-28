import { UTM_KEYS, utmSchema, type UtmParams } from "@short/core";
import { and, asc, count, eq, getDb, utmTemplates, type UtmTemplateRow } from "@short/db";
import { z } from "zod";
import { QuotaError } from "./action-result";

/** Per workspace; templates are a picker, not a campaign database. */
export const MAX_UTM_TEMPLATES = 50;

export const utmTemplateNameSchema = z.string().trim().min(1).max(64);

/** At least one parameter must be set; blanks are dropped before saving. */
export const utmTemplateValuesSchema = utmSchema
  .transform((utm) => compactUtm(utm))
  .refine((utm) => Object.keys(utm).length > 0, { message: "utmEmpty" });

export const utmTemplateInputSchema = z.object({
  name: utmTemplateNameSchema,
  utm: utmTemplateValuesSchema,
});

export type UtmTemplateInput = z.input<typeof utmTemplateInputSchema>;

export type UtmTemplateView = {
  id: string;
  name: string;
  utm: UtmParams;
  createdBy: string | null;
  createdAt: string;
};

function compactUtm(utm: UtmParams): UtmParams {
  const out: UtmParams = {};
  for (const key of UTM_KEYS) {
    const value = utm[key]?.trim();
    if (value) {
      out[key] = value;
    }
  }
  return out;
}

function toView(row: UtmTemplateRow): UtmTemplateView {
  return {
    id: row.id,
    name: row.name,
    utm: row.utm,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listUtmTemplates(workspaceId: string): Promise<UtmTemplateView[]> {
  const rows = await getDb()
    .select()
    .from(utmTemplates)
    .where(eq(utmTemplates.workspaceId, workspaceId))
    .orderBy(asc(utmTemplates.name));
  return rows.map(toView);
}

export async function getUtmTemplate(workspaceId: string, id: string): Promise<UtmTemplateView | null> {
  if (!z.string().uuid().safeParse(id).success) {
    return null;
  }
  const [row] = await getDb()
    .select()
    .from(utmTemplates)
    .where(and(eq(utmTemplates.workspaceId, workspaceId), eq(utmTemplates.id, id)))
    .limit(1);
  return row ? toView(row) : null;
}

/** Throws `QuotaError("utm_templates")` at the cap; a duplicate name is a unique violation. */
export async function createUtmTemplate(
  workspaceId: string,
  createdBy: string | null,
  input: z.output<typeof utmTemplateInputSchema>,
): Promise<UtmTemplateView> {
  const db = getDb();
  const [existing] = await db
    .select({ value: count() })
    .from(utmTemplates)
    .where(eq(utmTemplates.workspaceId, workspaceId));
  if ((existing?.value ?? 0) >= MAX_UTM_TEMPLATES) {
    throw new QuotaError(`A workspace can keep ${MAX_UTM_TEMPLATES} UTM templates.`, "utm_templates");
  }

  const [row] = await db
    .insert(utmTemplates)
    .values({ workspaceId, createdBy, name: input.name, utm: input.utm })
    .returning();
  if (!row) {
    throw new Error("UTM template insert returned no row");
  }
  return toView(row);
}

/** Returns null when the template is not in this workspace. */
export async function updateUtmTemplate(
  workspaceId: string,
  id: string,
  patch: { name?: string; utm?: UtmParams },
): Promise<UtmTemplateView | null> {
  if (!z.string().uuid().safeParse(id).success) {
    return null;
  }
  const [row] = await getDb()
    .update(utmTemplates)
    .set({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.utm !== undefined ? { utm: patch.utm } : {}),
    })
    .where(and(eq(utmTemplates.workspaceId, workspaceId), eq(utmTemplates.id, id)))
    .returning();
  return row ? toView(row) : null;
}

/** Returns false when the template is not in this workspace. */
export async function deleteUtmTemplate(workspaceId: string, id: string): Promise<boolean> {
  if (!z.string().uuid().safeParse(id).success) {
    return false;
  }
  const deleted = await getDb()
    .delete(utmTemplates)
    .where(and(eq(utmTemplates.workspaceId, workspaceId), eq(utmTemplates.id, id)))
    .returning({ id: utmTemplates.id });
  return deleted.length > 0;
}

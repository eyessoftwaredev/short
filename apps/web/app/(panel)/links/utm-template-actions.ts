"use server";

import { revalidatePath } from "next/cache";
import { isUniqueViolation } from "@short/db";
import { z } from "zod";
import { fail, fromZodError, ok, QuotaError, toActionError, type ActionResult } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { canWriteWorkspace, requireWorkspace } from "@/lib/session";
import {
  createUtmTemplate,
  deleteUtmTemplate,
  listUtmTemplates,
  updateUtmTemplate,
  utmTemplateInputSchema,
  utmTemplateNameSchema,
  utmTemplateValuesSchema,
  type UtmTemplateInput,
  type UtmTemplateView,
} from "@/lib/utm-templates";

const idSchema = z.string().uuid();

const updateSchema = z
  .object({ name: utmTemplateNameSchema.optional(), utm: utmTemplateValuesSchema.optional() })
  .refine((value) => value.name !== undefined || value.utm !== undefined, { message: "validation" });

function templateError(error: unknown): ActionResult<never> {
  if (isUniqueViolation(error)) {
    return fail("utm_template_exists");
  }
  if (error instanceof QuotaError && error.resource === "utm_templates") {
    return fail("utm_template_limit");
  }
  return toActionError(error);
}

/** Every template in the active workspace, sorted by name. Any member may read. */
export async function listUtmTemplatesAction(): Promise<ActionResult<UtmTemplateView[]>> {
  try {
    const context = await requireWorkspace();
    return ok(await listUtmTemplates(context.workspace.id));
  } catch (error) {
    return toActionError(error);
  }
}

/** Errors: `validation` (field errors on `name` / `utm`), `utm_template_exists`, `utm_template_limit` (50). */
export async function createUtmTemplateAction(values: UtmTemplateInput): Promise<ActionResult<UtmTemplateView>> {
  try {
    const context = await requireWorkspace();
    if (!canWriteWorkspace(context)) {
      return fail("forbidden");
    }
    const parsed = utmTemplateInputSchema.safeParse(values);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    const template = await createUtmTemplate(context.workspace.id, context.user.id, parsed.data);
    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "utm_template.created",
      targetType: "utm_template",
      targetId: template.id,
      metadata: { name: template.name },
    });

    revalidatePath("/links");
    return ok(template);
  } catch (error) {
    return templateError(error);
  }
}

export async function renameUtmTemplateAction(id: string, name: string): Promise<ActionResult<UtmTemplateView>> {
  return updateUtmTemplateAction(id, { name });
}

/** Changes the name and/or the parameters; omitted fields stay as they are. */
export async function updateUtmTemplateAction(
  id: string,
  values: { name?: string; utm?: UtmTemplateInput["utm"] },
): Promise<ActionResult<UtmTemplateView>> {
  try {
    const context = await requireWorkspace();
    if (!canWriteWorkspace(context)) {
      return fail("forbidden");
    }
    if (!idSchema.safeParse(id).success) {
      return fail("validation");
    }
    const parsed = updateSchema.safeParse(values);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    const template = await updateUtmTemplate(context.workspace.id, id, parsed.data);
    if (!template) {
      return fail("not_found");
    }
    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "utm_template.updated",
      targetType: "utm_template",
      targetId: template.id,
      metadata: { name: template.name, fields: Object.keys(parsed.data) },
    });

    revalidatePath("/links");
    return ok(template);
  } catch (error) {
    return templateError(error);
  }
}

/** A workspace default pointing at the template is cleared by the foreign key. */
export async function deleteUtmTemplateAction(id: string): Promise<ActionResult<null>> {
  try {
    const context = await requireWorkspace();
    if (!canWriteWorkspace(context)) {
      return fail("forbidden");
    }
    if (!idSchema.safeParse(id).success) {
      return fail("validation");
    }
    if (!(await deleteUtmTemplate(context.workspace.id, id))) {
      return fail("not_found");
    }
    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "utm_template.deleted",
      targetType: "utm_template",
      targetId: id,
    });

    revalidatePath("/links");
    revalidatePath("/settings");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

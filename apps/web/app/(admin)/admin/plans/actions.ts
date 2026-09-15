"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PLAN_KEYS } from "@short/core";
import { eq, getDb, plans } from "@short/db";
import { fromZodError, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { requireSuperadmin } from "@/lib/session";

const limitSchema = z.number().int().min(-1);

const planUpdateSchema = z.object({
  key: z.enum(PLAN_KEYS),
  name: z.string().min(1).max(40),
  priceMonthly: z.number().int().min(0),
  priceYearly: z.number().int().min(0),
  currency: z.enum(["USD", "TRY", "EUR"]),
  stripePriceMonthlyId: z.string().max(120).nullable(),
  stripePriceYearlyId: z.string().max(120).nullable(),
  visible: z.boolean(),
  limits: z.object({
    links: limitSchema,
    clicksPerMonth: limitSchema,
    customDomains: limitSchema,
    biopages: limitSchema,
    qrCodes: limitSchema,
    members: limitSchema,
    retentionDays: z.number().int().min(1),
    apiRequestsPerHour: limitSchema,
  }),
  features: z.object({
    targeting: z.boolean(),
    abTesting: z.boolean(),
    passwordProtection: z.boolean(),
    cloaking: z.boolean(),
    qrLogo: z.boolean(),
    webhooks: z.boolean(),
    apiAccess: z.boolean(),
    removeBranding: z.boolean(),
  }),
});

export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;

/**
 * Limits live in Postgres so pricing can change without a deploy. `@short/core` keeps
 * the compiled-in defaults that seed this table and act as the fallback.
 */
export async function updatePlanAction(values: PlanUpdateInput): Promise<ActionResult<null>> {
  try {
    const context = await requireSuperadmin();
    const parsed = planUpdateSchema.safeParse(values);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }
    const input = parsed.data;

    await getDb()
      .update(plans)
      .set({
        name: input.name,
        priceMonthly: input.priceMonthly,
        priceYearly: input.priceYearly,
        currency: input.currency,
        limits: input.limits,
        features: input.features,
        stripePriceMonthlyId:
          input.stripePriceMonthlyId?.trim() === "" ? null : input.stripePriceMonthlyId,
        stripePriceYearlyId:
          input.stripePriceYearlyId?.trim() === "" ? null : input.stripePriceYearlyId,
        visible: input.visible,
        updatedAt: new Date(),
      })
      .where(eq(plans.key, input.key));

    await recordAudit({
      workspaceId: null,
      actorId: context.user.id,
      action: "admin.plan.updated",
      targetType: "plan",
      targetId: input.key,
      metadata: { priceMonthly: input.priceMonthly, visible: input.visible },
    });

    revalidatePath("/admin/plans");
    revalidatePath("/billing");
    return ok(null);
  } catch (error) {
    return toActionError(error);
  }
}

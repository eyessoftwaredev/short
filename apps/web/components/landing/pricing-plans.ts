import type { PlanFeatures, PlanKey } from "@short/core";

/*
 * Shared between the server-rendered pricing page (comparison matrix) and the
 * client plan cards. Kept out of the "use client" module: helpers exported from
 * a client file become references the server cannot call.
 */

export type PublicPlan = {
  key: PlanKey;
  name: string;
  /** Minor units (cents / kuruş). */
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  limits: {
    links: number;
    clicksPerMonth: number;
    customDomains: number;
    biopages: number;
    qrCodes: number;
    members: number;
    teams: number;
    retentionDays: number;
    apiRequestsPerHour: number;
  };
  features: PlanFeatures;
};

/** Feature keys in the order the cards and the matrix list them. */
export const PLAN_FEATURE_ROWS = [
  ["targeting", "featureTargeting"],
  ["abTesting", "featureAb"],
  ["passwordProtection", "featurePassword"],
  ["qrLogo", "featureQrLogo"],
  ["shortSlugs", "featureShortSlugs"],
  ["apiAccess", "featureApi"],
  ["webhooks", "featureWebhooks"],
  ["bioForms", "featureBioForms"],
  ["customCss", "featureCustomCss"],
  ["removeBranding", "featureBranding"],
  ["cloaking", "featureCloak"],
] as const satisfies ReadonlyArray<readonly [keyof PlanFeatures, string]>;

/** A plan with no price that is not the free tier is sold on request (Enterprise). */
export function isCustomPriced(plan: PublicPlan): boolean {
  return plan.key !== "free" && plan.priceMonthly === 0 && plan.priceYearly === 0;
}

export function isFreePlan(plan: PublicPlan): boolean {
  return plan.key === "free";
}

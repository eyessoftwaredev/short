export const PLAN_KEYS = ["free", "pro", "business", "enterprise", "infinity"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

/** Plans customers can subscribe to. Infinity is staff-only and never sold. */
export const PUBLIC_PLAN_KEYS = ["free", "pro", "business", "enterprise"] as const;
export type PublicPlanKey = (typeof PUBLIC_PLAN_KEYS)[number];

export function isInternalPlan(key: string | null | undefined): boolean {
  return key === "infinity";
}

export function isPaidPublicPlan(key: string | null | undefined): boolean {
  return key === "pro" || key === "business" || key === "enterprise";
}

/** `-1` means unlimited. */
export type PlanLimits = {
  links: number;
  clicksPerMonth: number;
  customDomains: number;
  biopages: number;
  qrCodes: number;
  members: number;
  /** Team workspaces the billing owner may create. Personal does not count. */
  teams: number;
  retentionDays: number;
  apiRequestsPerHour: number;
};

export type PlanFeatures = {
  targeting: boolean;
  abTesting: boolean;
  passwordProtection: boolean;
  cloaking: boolean;
  qrLogo: boolean;
  webhooks: boolean;
  apiAccess: boolean;
  removeBranding: boolean;
};

export type PlanDefinition = {
  key: PlanKey;
  name: string;
  /** Monthly price in minor units (kuruş / cents). */
  priceMonthly: number;
  priceYearly: number;
  currency: "USD" | "TRY" | "EUR";
  limits: PlanLimits;
  features: PlanFeatures;
};

export const PLANS: Record<PlanKey, PlanDefinition> = {
  free: {
    key: "free",
    name: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    currency: "USD",
    limits: {
      links: 50,
      clicksPerMonth: 1_000,
      customDomains: 0,
      biopages: 1,
      qrCodes: 5,
      members: 1,
      teams: 0,
      retentionDays: 30,
      apiRequestsPerHour: 100,
    },
    features: {
      targeting: false,
      abTesting: false,
      passwordProtection: false,
      cloaking: false,
      qrLogo: false,
      webhooks: false,
      apiAccess: false,
      removeBranding: false,
    },
  },
  pro: {
    key: "pro",
    name: "Pro",
    priceMonthly: 1900,
    priceYearly: 19000,
    currency: "USD",
    limits: {
      links: 5_000,
      clicksPerMonth: 100_000,
      customDomains: 3,
      biopages: 5,
      qrCodes: 100,
      members: 3,
      teams: 1,
      retentionDays: 365,
      apiRequestsPerHour: 1_000,
    },
    features: {
      targeting: true,
      abTesting: true,
      passwordProtection: true,
      cloaking: false,
      qrLogo: true,
      webhooks: true,
      apiAccess: true,
      removeBranding: true,
    },
  },
  business: {
    key: "business",
    name: "Business",
    priceMonthly: 7900,
    priceYearly: 79000,
    currency: "USD",
    limits: {
      links: 50_000,
      clicksPerMonth: 1_000_000,
      customDomains: 25,
      biopages: 50,
      qrCodes: 1_000,
      members: 15,
      teams: 3,
      retentionDays: 730,
      apiRequestsPerHour: 10_000,
    },
    features: {
      targeting: true,
      abTesting: true,
      passwordProtection: true,
      cloaking: true,
      qrLogo: true,
      webhooks: true,
      apiAccess: true,
      removeBranding: true,
    },
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    priceMonthly: 0,
    priceYearly: 0,
    currency: "USD",
    limits: {
      links: -1,
      clicksPerMonth: -1,
      customDomains: -1,
      biopages: -1,
      qrCodes: -1,
      members: -1,
      teams: -1,
      retentionDays: 1_095,
      apiRequestsPerHour: 100_000,
    },
    features: {
      targeting: true,
      abTesting: true,
      passwordProtection: true,
      cloaking: true,
      qrLogo: true,
      webhooks: true,
      apiAccess: true,
      removeBranding: true,
    },
  },
  infinity: {
    key: "infinity",
    name: "Infinity",
    priceMonthly: 0,
    priceYearly: 0,
    currency: "USD",
    limits: {
      links: -1,
      clicksPerMonth: -1,
      customDomains: -1,
      biopages: -1,
      qrCodes: -1,
      members: -1,
      teams: -1,
      retentionDays: -1,
      apiRequestsPerHour: -1,
    },
    features: {
      targeting: true,
      abTesting: true,
      passwordProtection: true,
      cloaking: true,
      qrLogo: true,
      webhooks: true,
      apiAccess: true,
      removeBranding: true,
    },
  },
};

export function getPlan(key: string | null | undefined): PlanDefinition {
  const plan = PLAN_KEYS.find((candidate) => candidate === key);
  return PLANS[plan ?? "free"];
}

export function isWithinLimit(limit: number, current: number): boolean {
  return limit === -1 || current < limit;
}

/** `-1` means unlimited everywhere limits are stored, including admin-edited plan rows. */
export function formatLimit(limit: number): string {
  return limit === -1 ? "Unlimited" : new Intl.NumberFormat("en-US").format(limit);
}

export function limitUsageRatio(limit: number, current: number): number {
  if (limit <= 0) {
    return 0;
  }
  return Math.min(1, current / limit);
}

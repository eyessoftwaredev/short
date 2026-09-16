export const CONSENT_COOKIE = "short-consent";
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

export const CONSENT_CATEGORIES = ["necessary", "analytics", "marketing"] as const;
export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];

export type ConsentState = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  ts: number;
};

const PLATFORM_PREFIXES = [
  "/login",
  "/register",
  "/verify",
  "/forgot",
  "/reset",
  "/invite",
  "/pricing",
  "/terms",
  "/privacy",
  "/cookies",
  "/dashboard",
  "/links",
  "/qr",
  "/bio",
  "/analytics",
  "/domains",
  "/settings",
  "/billing",
  "/admin",
  "/onboarding",
  "/docs",
  "/api",
] as const;

export function isPlatformPath(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }
  return PLATFORM_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function defaultConsent(): ConsentState {
  return { necessary: true, analytics: false, marketing: false, ts: 0 };
}

export function parseConsent(raw: string | undefined): ConsentState | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    if (typeof parsed.analytics !== "boolean" || typeof parsed.marketing !== "boolean") {
      return null;
    }
    return {
      necessary: true,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      ts: typeof parsed.ts === "number" ? parsed.ts : Date.now(),
    };
  } catch {
    return null;
  }
}

export function serializeConsent(state: Omit<ConsentState, "necessary" | "ts"> & { ts?: number }): string {
  const next: ConsentState = {
    necessary: true,
    analytics: state.analytics,
    marketing: state.marketing,
    ts: state.ts ?? Date.now(),
  };
  return JSON.stringify(next);
}

export function hasConsent(state: ConsentState | null, category: ConsentCategory): boolean {
  if (category === "necessary") {
    return true;
  }
  if (!state) {
    return false;
  }
  return state[category];
}

export function acceptAllConsent(): ConsentState {
  return { necessary: true, analytics: true, marketing: true, ts: Date.now() };
}

export function rejectOptionalConsent(): ConsentState {
  return { necessary: true, analytics: false, marketing: false, ts: Date.now() };
}

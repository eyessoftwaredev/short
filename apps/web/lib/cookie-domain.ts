import { parentCookieDomain } from "@short/core";

/** Apex cookie Domain for this deploy, or undefined on localhost. */
export function cookieDomainFromEnv(): string | undefined {
  for (const value of [process.env.SITE_URL, process.env.APP_URL, process.env.BETTER_AUTH_URL]) {
    if (!value) {
      continue;
    }
    try {
      const domain = parentCookieDomain(new URL(value).hostname);
      if (domain) {
        return domain;
      }
    } catch {
      // ignore malformed env; the next candidate may still be valid
    }
  }
  return undefined;
}

export function sharedCookieOptions(): {
  path: "/";
  sameSite: "lax";
  secure: boolean;
  domain?: string;
} {
  const domain = cookieDomainFromEnv();
  return {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...(domain ? { domain } : {}),
  };
}

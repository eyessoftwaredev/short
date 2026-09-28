/**
 * Pure helpers shared by the server pages and the client components of the links area.
 * Kept out of the "use client" modules: a server component cannot call a function that
 * is exported from a client module.
 */

/**
 * What a visitor gets right now, in the order the edge decides it: an archived or
 * blocked link never redirects, a used-up or lapsed one falls back to its expiry
 * page, a scheduled one is not live yet.
 */
export type LinkStatus = "active" | "scheduled" | "expired" | "limit" | "archived" | "disabled";

export type LinkStatusInput = {
  archived: boolean;
  disabled: boolean;
  limitReached: boolean;
  /** ISO timestamps. */
  expiresAt: string | null;
  startsAt: string | null;
};

export function linkStatusOf(link: LinkStatusInput, now: number): LinkStatus {
  if (link.disabled) {
    return "disabled";
  }
  if (link.archived) {
    return "archived";
  }
  if (link.limitReached) {
    return "limit";
  }
  if (link.expiresAt != null && new Date(link.expiresAt).getTime() <= now) {
    return "expired";
  }
  if (link.startsAt != null && new Date(link.startsAt).getTime() > now) {
    return "scheduled";
  }
  return "active";
}

/** `acme.com` from `https://www.acme.com/spring?x=1`; null for anything unparsable. */
export function hostnameOf(url: string): string | null {
  const value = url.trim();
  if (value === "") {
    return null;
  }
  try {
    const parsed = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** Host + path without the scheme, `www.` or a lone trailing slash: what people read. */
export function displayUrl(url: string): { host: string; rest: string } {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = `${parsed.pathname === "/" ? "" : parsed.pathname}${parsed.search}${parsed.hash}`;
    return { host, rest: path };
  } catch {
    return { host: url, rest: "" };
  }
}

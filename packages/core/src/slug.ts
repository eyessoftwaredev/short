/** Ambiguous glyphs (0/O, 1/l/I) are excluded so slugs survive being read aloud or retyped. */
const SLUG_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

export const SLUG_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

/**
 * Paths the panel, the public site and the redirect worker own. A short link can never
 * take one of these, otherwise it would shadow a real route.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "_next",
  "about",
  "admin",
  "analytics",
  "api",
  "app",
  "assets",
  "auth",
  "bio",
  "billing",
  "blog",
  "cdn",
  "contact",
  "dashboard",
  "docs",
  "domains",
  "favicon.ico",
  "forgot",
  "ftp",
  "help",
  "images",
  "img",
  "invite",
  "legal",
  "links",
  "login",
  "logout",
  "mail",
  "new",
  "onboarding",
  "pricing",
  "privacy",
  "public",
  "qr",
  "register",
  "reset",
  "robots.txt",
  "settings",
  "signin",
  "signup",
  "sitemap.xml",
  "static",
  "status",
  "support",
  "team",
  "terms",
  "upload",
  "verify",
  "webhook",
  "webhooks",
  "workspace",
  "www",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

export type SlugValidation = { ok: true } | { ok: false; reason: "format" | "reserved" };

export function validateSlug(slug: string): SlugValidation {
  if (!SLUG_PATTERN.test(slug)) {
    return { ok: false, reason: "format" };
  }
  if (isReservedSlug(slug)) {
    return { ok: false, reason: "reserved" };
  }
  return { ok: true };
}

/** Cryptographically random slug. Collisions are handled by a unique index + retry at the call site. */
export function generateSlug(length = 7): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) {
    out += SLUG_ALPHABET[byte % SLUG_ALPHABET.length];
  }
  return out;
}

/** Turns free text into a URL-safe handle for biopages and custom slugs. */
export function slugify(input: string, maxLength = 48): string {
  const folded = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ş/gi, "s")
    .replace(/ğ/gi, "g")
    .replace(/ç/gi, "c")
    .replace(/ö/gi, "o")
    .replace(/ü/gi, "u");

  return folded
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

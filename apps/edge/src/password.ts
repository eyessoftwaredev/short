const encoder = new TextEncoder();

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function gateCookieName(linkId: string): string {
  return `sl_pw_${linkId.replace(/[^a-zA-Z0-9]/g, "")}`;
}

/**
 * Proof-of-password cookie. Derived from the stored hash plus a server secret, so it
 * cannot be forged and it invalidates automatically when the password changes.
 *
 * The expiry is part of the signed material rather than only a `Max-Age` hint, so a
 * leaked cookie value stops working on the server side too instead of becoming a
 * permanent shareable bypass token.
 */
export async function gateCookieValue(
  linkId: string,
  passwordHash: string,
  salt: string,
  expiresAt: number,
): Promise<string> {
  const mac = await sha256Hex(`${salt}|gate|${linkId}|${passwordHash}|${expiresAt}`);
  return `${expiresAt}.${mac}`;
}

export async function verifyGateCookie(
  presented: string | null,
  linkId: string,
  passwordHash: string,
  salt: string,
): Promise<boolean> {
  if (!presented) {
    return false;
  }

  const separator = presented.indexOf(".");
  if (separator < 1) {
    return false;
  }

  const expiresAt = Number.parseInt(presented.slice(0, separator), 10);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  return timingSafeEqual(presented, await gateCookieValue(linkId, passwordHash, salt, expiresAt));
}

export function readCookie(header: string | null, name: string): string | null {
  if (!header) {
    return null;
  }
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.split("=");
    if (rawKey?.trim() === name) {
      return rest.join("=").trim();
    }
  }
  return null;
}

/** Length-invariant comparison so a timing side channel cannot leak the expected token. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

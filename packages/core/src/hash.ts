/**
 * Small hashing helpers that work in workerd, Node and the browser.
 * Used for deterministic A/B bucketing and for privacy-preserving visitor ids.
 */

/** FNV-1a 32-bit. Deterministic and stable across runtimes — do not swap implementations. */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Maps a key onto [0, 1) so the same visitor always lands in the same A/B bucket. */
export function hashToUnitInterval(input: string): number {
  return fnv1a(input) / 0x100000000;
}

/**
 * Picks an index from weighted variants. Weights need not sum to 100.
 * Returns 0 when weights are empty or all zero.
 */
export function pickWeightedIndex(weights: number[], unit: number): number {
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (total <= 0) {
    return 0;
  }
  let cursor = unit * total;
  for (let i = 0; i < weights.length; i += 1) {
    cursor -= Math.max(0, weights[i] ?? 0);
    if (cursor < 0) {
      return i;
    }
  }
  return weights.length - 1;
}

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = "";
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, "0");
  }
  return out;
}

/**
 * Derives a rotating pseudonymous visitor id. The raw IP never leaves this function,
 * and the daily salt makes the value unlinkable across days (KVKK / GDPR).
 */
export async function deriveVisitorId(parts: {
  ip: string;
  userAgent: string;
  linkId: string;
  dailySalt: string;
}): Promise<string> {
  const material = `${parts.dailySalt}|${parts.ip}|${parts.userAgent}|${parts.linkId}`;
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(material));
  return toHex(digest).slice(0, 32);
}

/** YYYY-MM-DD in UTC; combined with a server secret to form the daily salt. */
export function utcDayStamp(at: Date = new Date()): string {
  return at.toISOString().slice(0, 10);
}

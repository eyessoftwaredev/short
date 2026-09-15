/**
 * Password hashing for link gates. PBKDF2 via WebCrypto so the panel (Node) can hash and
 * the redirect worker (workerd) can verify with identical code.
 *
 * Encoded as `pbkdf2$<iterations>$<salt-b64>$<hash-b64>`.
 */

const ITERATIONS = 100_000;
const KEY_BITS = 256;
const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

export async function hashGatePassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

/** Constant-time comparison so a timing side channel cannot reveal the expected digest. */
function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

export async function verifyGatePassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") {
    return false;
  }

  const iterations = Number.parseInt(parts[1] ?? "", 10);
  if (!Number.isFinite(iterations) || iterations < 1000) {
    return false;
  }

  try {
    const salt = fromBase64(parts[2] ?? "");
    const expected = fromBase64(parts[3] ?? "");
    const actual = await derive(password, salt, iterations);
    return equalBytes(actual, expected);
  } catch {
    return false;
  }
}

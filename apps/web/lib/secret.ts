import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { serverEnv } from "./env";

const ALGO = "aes-256-gcm";
const SALT = "short-secrets";
/** Tokens written before SECRET_ENCRYPTION_KEY existed. */
const LEGACY_SALT = "short-cf-conn";

function deriveKey(secret: string, salt: string): Buffer {
  return scryptSync(secret, salt, 32);
}

function modernKey(): Buffer {
  return deriveKey(serverEnv().SECRET_ENCRYPTION_KEY, SALT);
}

function legacyKey(): Buffer | null {
  const secret = serverEnv().BETTER_AUTH_SECRET;
  if (!secret) {
    return null;
  }
  return deriveKey(secret, LEGACY_SALT);
}

function tryDecrypt(packed: string, key: Buffer): string | null {
  const [ivPart, tagPart, dataPart] = packed.split(".");
  if (!ivPart || !tagPart || !dataPart) {
    return null;
  }
  try {
    const decipher = createDecipheriv(ALGO, key, Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    return null;
  }
}

/** Packs iv, auth tag and ciphertext so a token can sit in Postgres at rest. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, modernKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(packed: string): string {
  const modern = tryDecrypt(packed, modernKey());
  if (modern !== null) {
    return modern;
  }
  const legacy = legacyKey();
  if (legacy) {
    const recovered = tryDecrypt(packed, legacy);
    if (recovered !== null) {
      return recovered;
    }
  }
  throw new Error("Malformed secret");
}

/**
 * Re-writes a ciphertext that still uses the pre-envelope key. Callers persist the
 * returned value so the next read no longer depends on BETTER_AUTH_SECRET.
 */
export function reencryptIfLegacy(packed: string): string | null {
  if (tryDecrypt(packed, modernKey()) !== null) {
    return null;
  }
  const legacy = legacyKey();
  if (!legacy) {
    return null;
  }
  const recovered = tryDecrypt(packed, legacy);
  return recovered === null ? null : encryptSecret(recovered);
}

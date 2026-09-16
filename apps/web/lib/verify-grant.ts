import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { serverEnv } from "./env";
import { getSessionContext } from "./session";
import { normalizeEmail } from "./verify-resend";

export const VERIFY_GRANT_COOKIE = "short_verify";
const GRANT_TTL_SEC = 60 * 60 * 24;

type GrantPayload = {
  email: string;
  exp: number;
};

function sign(body: string): string {
  return createHmac("sha256", serverEnv().BETTER_AUTH_SECRET).update(body).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export function createVerifyGrant(email: string): string {
  const payload: GrantPayload = {
    email: normalizeEmail(email),
    exp: Date.now() + GRANT_TTL_SEC * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function parseVerifyGrant(token: string): string | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) {
    return null;
  }
  if (!safeEqual(sign(body), mac)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<GrantPayload>;
    if (typeof payload.email !== "string" || typeof payload.exp !== "number") {
      return null;
    }
    if (payload.exp < Date.now()) {
      return null;
    }
    return normalizeEmail(payload.email);
  } catch {
    return null;
  }
}

export async function writeVerifyGrant(email: string): Promise<void> {
  const jar = await cookies();
  jar.set(VERIFY_GRANT_COOKIE, createVerifyGrant(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GRANT_TTL_SEC,
  });
}

export async function readVerifyGrant(): Promise<string | null> {
  const jar = await cookies();
  return parseVerifyGrant(jar.get(VERIFY_GRANT_COOKIE)?.value ?? "");
}

/** Email the current request is allowed to resend to — grant cookie or unverified session. */
export async function getAllowedVerifyEmail(): Promise<string | null> {
  const granted = await readVerifyGrant();
  if (granted) {
    return granted;
  }
  const context = await getSessionContext();
  if (context && !context.user.emailVerified) {
    return normalizeEmail(context.user.email);
  }
  return null;
}

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { sharedCookieOptions } from "./cookie-domain";
import { serverEnv } from "./env";

export const DRAFT_COOKIE = "short_draft";
const DRAFT_TTL_SEC = 60 * 60 * 24;

type DraftPayload = {
  url: string;
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

export function normalizeDestination(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return null;
  }
  try {
    const href = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    const parsed = new URL(href);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function createDraft(url: string): string {
  const payload: DraftPayload = { url, exp: Date.now() + DRAFT_TTL_SEC * 1000 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function parseDraft(token: string): string | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) {
    return null;
  }
  if (!safeEqual(sign(body), mac)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<DraftPayload>;
    if (typeof payload.url !== "string" || typeof payload.exp !== "number") {
      return null;
    }
    if (payload.exp < Date.now()) {
      return null;
    }
    return normalizeDestination(payload.url);
  } catch {
    return null;
  }
}

export async function writeDraftDestination(url: string): Promise<void> {
  const normalized = normalizeDestination(url);
  if (!normalized) {
    return;
  }
  const jar = await cookies();
  jar.set(DRAFT_COOKIE, createDraft(normalized), {
    httpOnly: true,
    maxAge: DRAFT_TTL_SEC,
    ...sharedCookieOptions(),
  });
}

export async function readDraftDestination(): Promise<string | null> {
  const jar = await cookies();
  return parseDraft(jar.get(DRAFT_COOKIE)?.value ?? "");
}

export async function clearDraftDestination(): Promise<void> {
  const jar = await cookies();
  jar.delete({ name: DRAFT_COOKIE, ...sharedCookieOptions() });
}

/** After verify/onboarding, send a first-time member to the prefilled editor. */
export async function firstWinPath(): Promise<string> {
  const draft = await readDraftDestination();
  return draft ? "/links/new" : "/dashboard";
}

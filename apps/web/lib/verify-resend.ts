import { createHash } from "node:crypto";
import { getRedis, rateLimit } from "./redis";
import { serverEnv } from "./env";

const COOLDOWNS_SEC = [30, 120, 300, 900] as const;
const MAX_SENDS_PER_DAY = 5;
const EMAIL_WINDOW_SEC = 86_400;
const IP_LIMIT = 10;
const IP_WINDOW_SEC = 3_600;

export type ResendGate = {
  allowed: boolean;
  remainingSeconds: number;
};

type ResendState = {
  count: number;
  lastSentAt: number;
};

function emailKey(normalized: string): string {
  const hash = createHash("sha256").update(normalized).digest("hex");
  return `${serverEnv().REDIS_KEY_PREFIX}verify:resend:${hash}`;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseState(raw: string | null): ResendState | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ResendState>;
    if (typeof parsed.count !== "number" || typeof parsed.lastSentAt !== "number") {
      return null;
    }
    return { count: parsed.count, lastSentAt: parsed.lastSentAt };
  } catch {
    return null;
  }
}

function cooldownAfterCount(count: number): number {
  if (count <= 0) {
    return 0;
  }
  const index = Math.min(count, COOLDOWNS_SEC.length) - 1;
  return COOLDOWNS_SEC[index] ?? COOLDOWNS_SEC[COOLDOWNS_SEC.length - 1];
}

function remainingFromState(state: ResendState, ttlSeconds: number | null): number {
  if (state.count >= MAX_SENDS_PER_DAY) {
    if (ttlSeconds !== null && ttlSeconds > 0) {
      return ttlSeconds;
    }
    return Math.max(1, EMAIL_WINDOW_SEC - Math.floor((Date.now() - state.lastSentAt) / 1000));
  }

  const needed = cooldownAfterCount(state.count);
  const elapsed = Math.floor((Date.now() - state.lastSentAt) / 1000);
  return Math.max(0, needed - elapsed);
}

function remainingFromReset(resetAt: number): number {
  return Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
}

/**
 * Graduated per-email cooldown plus a daily cap and an IP hourly ceiling.
 * Missing Redis fails open so local development still delivers the email.
 */
export async function consumeResendSlot(email: string, ip: string): Promise<ResendGate> {
  const normalized = normalizeEmail(email);
  const redis = getRedis();

  if (!redis) {
    return { allowed: true, remainingSeconds: COOLDOWNS_SEC[0] };
  }

  try {
    const key = emailKey(normalized);
    const [raw, ttl] = await Promise.all([redis.get(key), redis.ttl(key)]);
    const state = parseState(raw);

    if (state) {
      const wait = remainingFromState(state, ttl > 0 ? ttl : null);
      if (wait > 0) {
        return { allowed: false, remainingSeconds: wait };
      }
    }

    const ipLimit = await rateLimit(`verify-ip:${ip}`, IP_LIMIT, IP_WINDOW_SEC);
    if (!ipLimit.allowed) {
      return { allowed: false, remainingSeconds: remainingFromReset(ipLimit.resetAt) };
    }

    const next: ResendState = {
      count: (state?.count ?? 0) + 1,
      lastSentAt: Date.now(),
    };
    if (state) {
      await redis.set(key, JSON.stringify(next), "KEEPTTL");
    } else {
      await redis.set(key, JSON.stringify(next), "EX", EMAIL_WINDOW_SEC);
    }

    return { allowed: true, remainingSeconds: cooldownAfterCount(next.count) };
  } catch (error) {
    console.error("consumeResendSlot failed, allowing request", error);
    return { allowed: true, remainingSeconds: COOLDOWNS_SEC[0] };
  }
}

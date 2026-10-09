import Redis from "ioredis";
import { features, serverEnv } from "./env";

const globalForRedis = globalThis as unknown as {
  __shortRedis?: Redis;
  __shortRedisConnect?: Promise<void>;
};

/** Upper bound on waiting for the first handshake; past it the caller fails open as before. */
const CONNECT_WAIT_MS = 2_000;

export function redisKey(suffix: string): string {
  return `${serverEnv().REDIS_KEY_PREFIX}${suffix}`;
}

export function getRedis(): Redis | null {
  if (!features().redis) {
    return null;
  }
  if (!globalForRedis.__shortRedis) {
    globalForRedis.__shortRedis = new Redis(serverEnv().REDIS_URL ?? "", {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    globalForRedis.__shortRedis.on("error", (error) => {
      console.error("redis error", error.message);
    });
  }
  return globalForRedis.__shortRedis;
}

/**
 * `lazyConnect` opens the socket on the first command, but `enableOfflineQueue: false`
 * rejects every command sent before the socket is ready — so the first rate-limit check,
 * cache read or health ping after each boot used to fail. Await that first handshake
 * once (bounded) instead. Later disconnects still fail fast, which is the point of
 * disabling the offline queue.
 */
export async function readyRedis(): Promise<Redis | null> {
  const redis = getRedis();
  if (!redis) {
    return null;
  }
  if (redis.status === "wait") {
    globalForRedis.__shortRedisConnect ??= redis.connect().catch(() => {
      // The "error" listener already logged it; commands below fail open.
    });
  }
  const connecting = globalForRedis.__shortRedisConnect;
  if (connecting && redis.status !== "ready") {
    await Promise.race([connecting, new Promise((resolve) => setTimeout(resolve, CONNECT_WAIT_MS))]);
  }
  return redis;
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Fixed-window counter. When Redis is not configured the limiter fails open so local
 * development and self-hosted setups without Redis stay usable.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const redis = await readyRedis();
  const resetAt = (Math.floor(Date.now() / 1000 / windowSeconds) + 1) * windowSeconds * 1000;

  if (!redis) {
    return { allowed: true, remaining: limit, resetAt };
  }

  try {
    const windowKey = redisKey(`rl:${key}:${Math.floor(Date.now() / 1000 / windowSeconds)}`);
    // INCR and EXPIRE in one round trip so a crash in between cannot leave a counter
    // without a TTL.
    const results = await redis.multi().incr(windowKey).expire(windowKey, windowSeconds).exec();
    const count = Number(results?.[0]?.[1] ?? 0);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetAt };
  } catch (error) {
    console.error("rateLimit failed, allowing request", error);
    return { allowed: true, remaining: limit, resetAt };
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await readyRedis();
  if (!redis) {
    return null;
  }
  try {
    const raw = await redis.get(redisKey(`c:${key}`));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = await readyRedis();
  if (!redis) {
    return;
  }
  try {
    await redis.set(redisKey(`c:${key}`), JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Cache writes are best-effort.
  }
}

export async function cacheDelete(key: string): Promise<void> {
  const redis = await readyRedis();
  if (!redis) {
    return;
  }
  try {
    await redis.del(redisKey(`c:${key}`));
  } catch {
    // Same as writes: losing an invalidation only costs one TTL of staleness.
  }
}

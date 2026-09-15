import Redis from "ioredis";
import { features, serverEnv } from "./env";

const globalForRedis = globalThis as unknown as { __shortRedis?: Redis };

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
  const redis = getRedis();
  const resetAt = (Math.floor(Date.now() / 1000 / windowSeconds) + 1) * windowSeconds * 1000;

  if (!redis) {
    return { allowed: true, remaining: limit, resetAt };
  }

  try {
    const windowKey = `rl:${key}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
    const count = await redis.incr(windowKey);
    if (count === 1) {
      await redis.expire(windowKey, windowSeconds);
    }
    return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetAt };
  } catch (error) {
    console.error("rateLimit failed, allowing request", error);
    return { allowed: true, remaining: limit, resetAt };
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) {
    return null;
  }
  try {
    const raw = await redis.get(`c:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }
  try {
    await redis.set(`c:${key}`, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Cache writes are best-effort.
  }
}

export async function cacheDelete(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }
  try {
    await redis.del(`c:${key}`);
  } catch {
    // Same as writes: losing an invalidation only costs one TTL of staleness.
  }
}

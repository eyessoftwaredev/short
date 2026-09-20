import type { PlatformAssetKind } from "@short/db";

type CachedDeliver = {
  bytes: Buffer;
  contentType: string;
  etag: string;
};

const processed = new Map<string, CachedDeliver>();

function cacheKey(kind: PlatformAssetKind, updatedAt: number, format: string): string {
  return `${kind}:${updatedAt}:${format}`;
}

export function readDeliverCache(
  kind: PlatformAssetKind,
  updatedAt: Date,
  format: string,
): CachedDeliver | null {
  return processed.get(cacheKey(kind, updatedAt.getTime(), format)) ?? null;
}

export function writeDeliverCache(
  kind: PlatformAssetKind,
  updatedAt: Date,
  format: string,
  value: CachedDeliver,
): void {
  processed.set(cacheKey(kind, updatedAt.getTime(), format), value);
  if (processed.size > 48) {
    const oldest = processed.keys().next().value;
    if (oldest) {
      processed.delete(oldest);
    }
  }
}

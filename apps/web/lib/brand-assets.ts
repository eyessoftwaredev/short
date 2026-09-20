import "server-only";

import type { PlatformAssetKind } from "@short/db";
import { getPlatformAsset } from "@/lib/brand";

export type BrandLockupSources = {
  logoSrc: string;
  wordmarkSrc?: string;
  hasWordmark: boolean;
};

/** Versioned URL so browsers cache aggressively until the admin re-uploads. */
export function brandAssetUrl(kind: PlatformAssetKind, updatedAt?: Date | null): string {
  const base = `/api/brand/${kind}`;
  if (!updatedAt) {
    return base;
  }
  return `${base}?v=${updatedAt.getTime()}`;
}

async function resolveLogoAsset(invert: boolean) {
  const kind: PlatformAssetKind = invert ? "logo_dark" : "logo";
  const primary = await getPlatformAsset(kind);
  if (primary) {
    return { requestKind: kind, version: primary.updatedAt };
  }
  if (invert) {
    const fallback = await getPlatformAsset("logo");
    if (fallback) {
      return { requestKind: "logo" as const, version: fallback.updatedAt };
    }
  }
  return { requestKind: kind, version: null };
}

async function resolveWordmarkAsset(invert: boolean) {
  const kind: PlatformAssetKind = invert ? "wordmark_dark" : "wordmark";
  const asset = await getPlatformAsset(kind);
  return asset ? { requestKind: kind, version: asset.updatedAt } : null;
}

export async function getBrandLockupSources(invert = false): Promise<BrandLockupSources> {
  const [logo, wordmark] = await Promise.all([
    resolveLogoAsset(invert),
    resolveWordmarkAsset(invert),
  ]);

  return {
    logoSrc: brandAssetUrl(logo.requestKind, logo.version),
    wordmarkSrc: wordmark ? brandAssetUrl(wordmark.requestKind, wordmark.version) : undefined,
    hasWordmark: Boolean(wordmark),
  };
}

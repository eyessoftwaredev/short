import "server-only";
import { cache } from "react";
import {
  eq,
  getDb,
  PLATFORM_ASSET_KINDS,
  PLATFORM_SETTINGS_ID,
  platformAssets,
  platformSettings,
  type PlatformAssetKind,
  type PlatformLocale,
} from "@short/db";

export { PLATFORM_ASSET_KINDS, type PlatformAssetKind, type PlatformLocale };
export { FALLBACK_BRAND, type PlatformBrand } from "./brand-fallback";
import { FALLBACK_BRAND, type PlatformBrand } from "./brand-fallback";

/**
 * Singleton brand + locale policy for this deployment. Cached per request so layout,
 * metadata and the landing page share one query.
 */
export const getPlatformBrand = cache(async (): Promise<PlatformBrand> => {
  try {
    const [row] = await getDb()
      .select({
        name: platformSettings.name,
        tagline: platformSettings.tagline,
        defaultLocale: platformSettings.defaultLocale,
        localeSwitcherEnabled: platformSettings.localeSwitcherEnabled,
      })
      .from(platformSettings)
      .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID))
      .limit(1);

    if (!row) {
      return FALLBACK_BRAND;
    }

    return {
      name: row.name,
      tagline: row.tagline,
      defaultLocale: row.defaultLocale === "tr" ? "tr" : "en",
      localeSwitcherEnabled: row.localeSwitcherEnabled,
    };
  } catch (error) {
    console.error("getPlatformBrand failed", error);
    return FALLBACK_BRAND;
  }
});

export const getPlatformAsset = cache(async (kind: PlatformAssetKind) => {
  try {
    const [row] = await getDb()
      .select({
        kind: platformAssets.kind,
        contentType: platformAssets.contentType,
        bytes: platformAssets.bytes,
        updatedAt: platformAssets.updatedAt,
      })
      .from(platformAssets)
      .where(eq(platformAssets.kind, kind))
      .limit(1);
    return row ?? null;
  } catch (error) {
    console.error("getPlatformAsset failed", error);
    return null;
  }
});

export function isPlatformAssetKind(value: string): value is PlatformAssetKind {
  return (PLATFORM_ASSET_KINDS as readonly string[]).includes(value);
}

export function brandInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed === "" ? "S" : trimmed[0]!.toUpperCase();
}

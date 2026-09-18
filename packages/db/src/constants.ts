export const PLATFORM_SETTINGS_ID = "default";

export const PLATFORM_LOCALES = ["tr", "en"] as const;
export type PlatformLocale = (typeof PLATFORM_LOCALES)[number];

export const PLATFORM_ASSET_KINDS = [
  "logo",
  "logo_dark",
  "wordmark",
  "wordmark_dark",
  "favicon",
  "og",
] as const;
export type PlatformAssetKind = (typeof PLATFORM_ASSET_KINDS)[number];

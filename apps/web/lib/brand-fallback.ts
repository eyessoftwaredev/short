import type { PlatformLocale } from "@short/db/constants";

export type PlatformBrand = {
  name: string;
  tagline: string | null;
  defaultLocale: PlatformLocale;
  localeSwitcherEnabled: boolean;
};

export const FALLBACK_BRAND: PlatformBrand = {
  name: "Short",
  tagline: "Short links, QR codes and bio pages",
  defaultLocale: "en",
  localeSwitcherEnabled: true,
};

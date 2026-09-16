import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { getPlatformBrand } from "@/lib/brand";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales";

export { DEFAULT_LOCALE, isLocale, LOCALES, LOCALE_COOKIE, type Locale } from "./locales";

/**
 * Locale is stored in a cookie rather than in the URL: short links own the path space,
 * so a `/tr/...` prefix would collide with slugs. Cookie wins; otherwise the admin
 * default on `platform_settings`.
 */
export default getRequestConfig(async () => {
  const stored = (await cookies()).get("short-locale")?.value;
  const brand = await getPlatformBrand();
  const fromBrand: Locale = brand.defaultLocale === "tr" ? "tr" : DEFAULT_LOCALE;
  const locale: Locale = isLocale(stored) ? stored : fromBrand;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});

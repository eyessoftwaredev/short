"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/cx";

/** Custom event the cookie banner listens for to reopen with the category switches. */
export const OPEN_COOKIE_SETTINGS_EVENT = "short:open-cookie-settings";

/**
 * Lets a visitor change a cookie choice they already made. Without it the only
 * way back to the banner was clearing site data.
 */
export function CookieSettingsButton({ className }: { className?: string }) {
  const t = useTranslations("legal");
  return (
    <button
      type="button"
      className={cn("cursor-pointer border-0 bg-transparent p-0 text-left", className)}
      onClick={() => {
        window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
      }}
    >
      {t("manageCookies")}
    </button>
  );
}

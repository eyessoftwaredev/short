import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { BrandLockup } from "@/components/brand/brand-mark";
import { LocaleSwitcher } from "@/components/brand/locale-switcher";
import { getPlatformBrand } from "@/lib/brand";

export async function PublicChrome({ children }: { children: ReactNode }) {
  const [brand, t] = await Promise.all([getPlatformBrand(), getTranslations("landing")]);

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl min-w-0 items-center justify-between gap-4 px-6 py-4">
          <BrandLockup name={brand.name} href="/" />
          <div className="flex min-w-0 items-center gap-2.5">
            {brand.localeSwitcherEnabled ? <LocaleSwitcher /> : null}
            <Link className="kit-btn kit-btn--ghost" href="/login">
              {t("ctaSecondary")}
            </Link>
            <Link className="kit-btn kit-btn--primary hidden sm:inline-flex" href="/register">
              {t("ctaStart")}
            </Link>
          </div>
        </div>
      </header>
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      <PublicFooter />
    </div>
  );
}

export async function PublicFooter() {
  const [brand, t] = await Promise.all([getPlatformBrand(), getTranslations("landing")]);

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-wrap items-start justify-between gap-8 px-6 py-10">
        <div className="flex min-w-0 flex-col gap-2">
          <BrandLockup name={brand.name} />
          <span className="text-sm text-fg-muted">{t("footerRights")}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-2 text-sm">
          <span className="font-medium">{t("footerProduct")}</span>
          <Link href="/#features">{t("navFeatures")}</Link>
          <Link href="/#route">{t("navRoute")}</Link>
          <Link href="/pricing">{t("navPricing")}</Link>
          <Link href="/login">{t("ctaSecondary")}</Link>
        </div>
        <div className="flex min-w-0 flex-col gap-2 text-sm">
          <span className="font-medium">{t("footerLegal")}</span>
          <Link href="/terms">{t("footerTerms")}</Link>
          <Link href="/privacy">{t("footerPrivacy")}</Link>
          <Link href="/cookies">{t("footerCookies")}</Link>
        </div>
        <span className="text-sm text-fg-subtle">
          © {new Date().getFullYear()} {brand.name}
        </span>
      </div>
    </footer>
  );
}

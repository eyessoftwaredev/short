import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import "@/styles/kit/landing-index.css";
import { BrandLockup } from "@/components/brand/brand-mark";
import { LocaleSwitcher } from "@/components/brand/locale-switcher";
import { LandingAuthLinks } from "@/components/landing/landing-auth-links";
import { BrandPreload } from "@/components/brand/brand-preload";
import { getPlatformBrand } from "@/lib/brand";
import { getBrandLockupSources } from "@/lib/brand-assets";
import { panelUrl } from "@/lib/public-url";
import { getLandingAuthState } from "@/lib/session";

function panelOrigin(): string {
  return new URL(panelUrl()).origin;
}

export async function PublicChrome({ children }: { children: ReactNode }) {
  const [brand, t, signedIn, brandSources] = await Promise.all([
    getPlatformBrand(),
    getTranslations("landing"),
    getLandingAuthState(),
    getBrandLockupSources(),
  ]);

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-bg">
      <BrandPreload sources={brandSources} />
      <link rel="preconnect" href={panelOrigin()} />
      <link rel="dns-prefetch" href={panelOrigin()} />
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl min-w-0 items-center justify-between gap-4 px-6 py-4">
          <BrandLockup
            name={brand.name}
            href="/"
            logoSrc={brandSources.logoSrc}
            wordmarkSrc={brandSources.wordmarkSrc}
            hasWordmark={brandSources.hasWordmark}
          />
          <div className="flex min-w-0 items-center gap-2.5">
            {brand.localeSwitcherEnabled ? <LocaleSwitcher /> : null}
            <LandingAuthLinks t={t} signedIn={signedIn} />
          </div>
        </div>
      </header>
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      <PublicFooter signedIn={signedIn} />
    </div>
  );
}

export async function PublicFooter({ signedIn = false }: { signedIn?: boolean }) {
  const [brand, t, brandSources] = await Promise.all([
    getPlatformBrand(),
    getTranslations("landing"),
    getBrandLockupSources(),
  ]);

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-wrap items-start justify-between gap-8 px-6 py-10">
        <div className="flex min-w-0 flex-col gap-2">
          <BrandLockup
            name={brand.name}
            logoSrc={brandSources.logoSrc}
            wordmarkSrc={brandSources.wordmarkSrc}
            hasWordmark={brandSources.hasWordmark}
            wordmarkLazy
          />
          <span className="text-sm text-fg-muted">{t("footerRights")}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-2 text-sm">
          <span className="font-medium">{t("footerProduct")}</span>
          <Link href="/#features">{t("navFeatures")}</Link>
          <Link href="/#route">{t("navRoute")}</Link>
          <Link href="/pricing">{t("navPricing")}</Link>
          {signedIn ? (
            <Link href={panelUrl("/dashboard")}>{t("openPanel")}</Link>
          ) : (
            <Link href={panelUrl("/login")}>{t("ctaSecondary")}</Link>
          )}
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

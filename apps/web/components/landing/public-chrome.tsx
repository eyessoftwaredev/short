import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { BrandLockup } from "@/components/brand/brand-mark";
import { BrandPreload } from "@/components/brand/brand-preload";
import { LocaleSwitcher } from "@/components/brand/locale-switcher";
import { CookieSettingsButton } from "@/components/consent/cookie-settings-button";
import { LandingAuthLinks } from "@/components/landing/landing-auth-links";
import { PublicMobileNav } from "@/components/landing/public-mobile-nav";
import { ThemeToggle } from "@/components/landing/theme-toggle";
import { Button } from "@/components/ui";
import { getPlatformBrand } from "@/lib/brand";
import { getBrandLockupSources } from "@/lib/brand-assets";
import { panelUrl } from "@/lib/public-url";
import { getLandingAuthState } from "@/lib/session";

function panelOrigin(): string {
  return new URL(panelUrl()).origin;
}

/**
 * Header + footer for every public page (home, pricing, legal). Section links
 * are absolute (`/#features`) so they work from any of those pages; on the home
 * page the browser treats them as in-page jumps.
 */
export async function PublicChrome({ children }: { children: ReactNode }) {
  const [brand, t, tc, signedIn, brandSources] = await Promise.all([
    getPlatformBrand(),
    getTranslations("landing"),
    getTranslations("common"),
    getLandingAuthState(),
    getBrandLockupSources(),
  ]);

  const navLinks = [
    { href: "/#features", label: t("nav.features") },
    { href: "/#how", label: t("nav.howItWorks") },
    { href: "/pricing", label: t("nav.pricing") },
    { href: "/#faq", label: t("nav.faq") },
  ];
  const authLabels = {
    signIn: t("ctaSignIn"),
    start: t("ctaStart"),
    openPanel: t("openPanel"),
  };

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-bg text-ink">
      <BrandPreload sources={brandSources} />
      <link rel="preconnect" href={panelOrigin()} />
      <link rel="dns-prefetch" href={panelOrigin()} />
      <a
        href="#main"
        className="sr-only z-50 rounded-default bg-elevated px-3 py-2 text-sm font-medium shadow-pop focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {tc("skipToContent")}
      </a>

      <header className="sticky top-0 z-30 border-b border-border-subtle bg-bg/85 backdrop-blur-md">
        <div className="relative mx-auto flex h-16 w-full max-w-6xl min-w-0 items-center gap-3 px-4 sm:px-6">
          <BrandLockup
            name={brand.name}
            href="/"
            logoSrc={brandSources.logoSrc}
            wordmarkSrc={brandSources.wordmarkSrc}
            hasWordmark={brandSources.hasWordmark}
          />
          <nav className="ml-6 hidden items-center gap-0.5 md:flex" aria-label={tc("mainNav")}>
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-default px-3 py-2 text-sm font-medium text-fg-muted no-underline transition-colors hover:bg-surface hover:text-ink hover:no-underline"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex min-w-0 items-center gap-1.5">
            <ThemeToggle />
            {brand.localeSwitcherEnabled ? (
              <span className="hidden sm:inline-flex">
                <LocaleSwitcher />
              </span>
            ) : null}
            <LandingAuthLinks
              signedIn={signedIn}
              labels={authLabels}
              className="ml-1 hidden md:flex"
            />
            {signedIn ? null : (
              <Button variant="primary" size="sm" href={panelUrl("/register")} className="md:hidden">
                {t("ctaStart")}
              </Button>
            )}
            <PublicMobileNav
              links={navLinks}
              footer={
                <>
                  {brand.localeSwitcherEnabled ? (
                    <span className="sm:hidden">
                      <LocaleSwitcher />
                    </span>
                  ) : null}
                  <LandingAuthLinks signedIn={signedIn} labels={authLabels} block />
                </>
              }
            />
          </div>
        </div>
      </header>

      <main id="main" className="flex min-w-0 flex-1 flex-col">
        {children}
      </main>

      <footer className="border-t border-border-subtle bg-canvas">
        <div className="mx-auto grid w-full max-w-6xl min-w-0 gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div className="flex min-w-0 flex-col gap-3">
            <BrandLockup
              name={brand.name}
              logoSrc={brandSources.logoSrc}
              wordmarkSrc={brandSources.wordmarkSrc}
              hasWordmark={brandSources.hasWordmark}
              wordmarkLazy
            />
            <p className="m-0 max-w-xs text-sm leading-relaxed text-fg-muted">
              {brand.tagline ?? t("footer.tagline")}
            </p>
          </div>
          <FooterColumn title={t("footer.product")}>
            <FooterLink href="/#features">{t("nav.features")}</FooterLink>
            <FooterLink href="/#how">{t("nav.howItWorks")}</FooterLink>
            <FooterLink href="/pricing">{t("nav.pricing")}</FooterLink>
            <FooterLink href="/#faq">{t("nav.faq")}</FooterLink>
          </FooterColumn>
          <FooterColumn title={t("footer.account")}>
            {signedIn ? (
              <FooterLink href={panelUrl("/dashboard")}>{t("openPanel")}</FooterLink>
            ) : (
              <>
                <FooterLink href={panelUrl("/register")}>{t("ctaStart")}</FooterLink>
                <FooterLink href={panelUrl("/login")}>{t("ctaSignIn")}</FooterLink>
                <FooterLink href={panelUrl("/forgot")}>{t("footer.forgot")}</FooterLink>
              </>
            )}
          </FooterColumn>
          <FooterColumn title={t("footer.legal")}>
            <FooterLink href="/terms">{t("footer.terms")}</FooterLink>
            <FooterLink href="/privacy">{t("footer.privacy")}</FooterLink>
            <FooterLink href="/cookies">{t("footer.cookies")}</FooterLink>
            <li>
              <CookieSettingsButton className="text-sm text-fg-muted hover:text-ink" />
            </li>
          </FooterColumn>
        </div>
        <div className="border-t border-border-subtle">
          <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-5 text-[13px] text-fg-subtle sm:px-6">
            <span>
              © {new Date().getFullYear()} {brand.name}. {t("footer.rights")} ·{" "}
              <a
                href="https://eyessoftware.com"
                target="_blank"
                rel="noopener"
                className="font-medium text-fg-muted no-underline hover:text-ink hover:no-underline"
              >
                Eyes Software
              </a>
            </span>
            {brand.localeSwitcherEnabled ? <LocaleSwitcher /> : null}
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h2 className="m-0 text-[13px] font-semibold text-ink">{title}</h2>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  const external = /^https?:\/\//.test(href);
  const className = "text-sm text-fg-muted no-underline hover:text-ink hover:no-underline";
  return (
    <li>
      {external || href.includes("#") ? (
        <a href={href} className={className}>
          {children}
        </a>
      ) : (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
    </li>
  );
}

import { getTranslations } from "next-intl/server";
import { BrandLockup } from "@/components/brand/brand-mark";
import { BrandPreload } from "@/components/brand/brand-preload";
import { ThemeToggle } from "@/components/landing/theme-toggle";
import { Button } from "@/components/ui";
import { getPlatformBrand } from "@/lib/brand";
import { getBrandLockupSources } from "@/lib/brand-assets";

/**
 * Also the landing spot for unknown, expired and archived short links (the edge
 * sends them to /404), so it speaks to visitors first and account holders second.
 */
export default async function NotFoundPage() {
  const [brand, brandSources, t, tc, tl] = await Promise.all([
    getPlatformBrand(),
    getBrandLockupSources(),
    getTranslations("errors"),
    getTranslations("common"),
    getTranslations("legal"),
  ]);

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-canvas">
      <BrandPreload sources={brandSources} />
      <header className="flex min-w-0 items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <BrandLockup
          name={brand.name}
          href="/"
          logoSrc={brandSources.logoSrc}
          wordmarkSrc={brandSources.wordmarkSrc}
          hasWordmark={brandSources.hasWordmark}
        />
        <ThemeToggle />
      </header>

      <main id="main" className="relative isolate flex min-w-0 flex-1 items-center justify-center px-5 py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_50%_40%_at_50%_35%,var(--accent-surface),transparent_70%)]"
        />
        <div className="flex w-full max-w-lg min-w-0 flex-col items-center gap-5 text-center">
          <p className="numeric m-0 text-[5.5rem] leading-none font-semibold tracking-tighter text-accent-ink sm:text-[7rem]">
            404
          </p>
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-balance text-ink sm:text-3xl">
            {t("notFoundTitle")}
          </h1>
          <p className="m-0 text-[15px] leading-relaxed text-fg-muted">{t("notFoundBody")}</p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <Button variant="primary" size="lg" href="/" leadingIcon="house">
              {tl("backHome")}
            </Button>
            <Button size="lg" href="/dashboard">
              {tc("goToDashboard")}
            </Button>
          </div>
          <p className="m-0 max-w-sm text-[13px] leading-relaxed text-fg-subtle">{t("notFoundHint")}</p>
        </div>
      </main>
    </div>
  );
}

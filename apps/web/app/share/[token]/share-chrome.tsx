import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { BrandLockup } from "@/components/brand/brand-mark";
import { BrandPreload } from "@/components/brand/brand-preload";
import { Badge } from "@/components/ui";
import { getPlatformBrand } from "@/lib/brand";
import { getBrandLockupSources } from "@/lib/brand-assets";
import { serverEnv } from "@/lib/env";

/**
 * Minimal public frame for `/share/*`: brand header, centred content column and a
 * "Powered by" footer. `panel-root` opts the page into the panel's chart styles (the
 * Recharts tooltip is styled under it), `bg-canvas` gives cards something to sit on.
 */
export async function ShareChrome({ children }: { children: ReactNode }) {
  const [brand, brandSources, t] = await Promise.all([
    getPlatformBrand(),
    getBrandLockupSources(),
    getTranslations("share"),
  ]);
  const home = serverEnv().APP_URL.replace(/\/$/, "") || "/";

  return (
    <div className="panel-root flex min-h-screen min-w-0 flex-col bg-canvas text-ink">
      <BrandPreload sources={brandSources} />
      <header className="border-b border-border bg-bg">
        <div className="mx-auto flex w-full max-w-5xl min-w-0 items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <BrandLockup
            name={brand.name}
            href={home}
            logoSrc={brandSources.logoSrc}
            wordmarkSrc={brandSources.wordmarkSrc}
            hasWordmark={brandSources.hasWordmark}
          />
          <Badge tone="neutral" dot>
            {t("readOnly")}
          </Badge>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl min-w-0 flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        {children}
      </main>
      <footer className="border-t border-border-subtle">
        <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-5 text-[13px] text-fg-subtle sm:px-6">
          <span>
            {t.rich("poweredBy", {
              brand: (chunks) => (
                <a href={home} className="font-medium text-accent-ink hover:underline">
                  {chunks}
                </a>
              ),
              name: brand.name,
            })}
          </span>
          <a href={home} className="text-fg-muted hover:text-ink">
            {t("createYourOwn")}
          </a>
        </div>
      </footer>
    </div>
  );
}

import type { ReactNode } from "react";
import { BrandLockup } from "@/components/brand/brand-mark";
import { BrandPreload } from "@/components/brand/brand-preload";
import { getPlatformBrand } from "@/lib/brand";
import { getBrandLockupSources } from "@/lib/brand-assets";
import { serverEnv } from "@/lib/env";

/** Minimal public frame for `/share/*`: brand header, centred content column. */
export async function ShareChrome({ children }: { children: ReactNode }) {
  const [brand, brandSources] = await Promise.all([getPlatformBrand(), getBrandLockupSources()]);
  const home = serverEnv().APP_URL.replace(/\/$/, "") || "/";

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-bg">
      <BrandPreload sources={brandSources} />
      <header className="flex min-w-0 items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
        <BrandLockup
          name={brand.name}
          href={home}
          logoSrc={brandSources.logoSrc}
          wordmarkSrc={brandSources.wordmarkSrc}
          hasWordmark={brandSources.hasWordmark}
        />
      </header>
      <main className="mx-auto flex w-full max-w-5xl min-w-0 flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}

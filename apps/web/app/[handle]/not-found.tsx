import { Icon } from "@/components/kit/icon";
import { BrandLockup } from "@/components/brand/brand-mark";
import { EmptyState } from "@/components/ui";
import { BrandPreload } from "@/components/brand/brand-preload";
import { getPlatformBrand } from "@/lib/brand";
import { getBrandLockupSources } from "@/lib/brand-assets";
import { serverEnv } from "@/lib/env";
import { getTranslations } from "next-intl/server";

export default async function HandleNotFound() {
  const [brand, t, brandSources] = await Promise.all([
    getPlatformBrand(),
    getTranslations("panel"),
    getBrandLockupSources(),
  ]);
  const home = serverEnv().APP_URL.replace(/\/$/, "") || "/";

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-bg">
      <BrandPreload sources={brandSources} />
      <header className="flex min-w-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
        <BrandLockup
          name={brand.name}
          href={home}
          logoSrc={brandSources.logoSrc}
          wordmarkSrc={brandSources.wordmarkSrc}
          hasWordmark={brandSources.hasWordmark}
        />
      </header>
      <main className="flex min-w-0 flex-1 items-center justify-center px-6 py-16">
        <EmptyState
          className="w-full max-w-lg"
          icon={<Icon name="compass" className="text-lg" />}
          eyebrow="404"
          title={t("publicMissingTitle")}
          description={t("publicMissingBody")}
        />
      </main>
    </div>
  );
}

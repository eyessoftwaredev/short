import { Icon } from "@/components/kit/icon";
import { getTranslations } from "next-intl/server";
import { BrandLockup } from "@/components/brand/brand-mark";
import { BrandPreload } from "@/components/brand/brand-preload";
import { Button, EmptyState } from "@/components/ui";
import { getPlatformBrand } from "@/lib/brand";
import { getBrandLockupSources } from "@/lib/brand-assets";

export default async function NotFoundPage() {
  const [brand, brandSources] = await Promise.all([getPlatformBrand(), getBrandLockupSources()]);
  const t = await getTranslations("errors");
  const tc = await getTranslations("common");
  const ta = await getTranslations("auth");

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-bg">
      <BrandPreload sources={brandSources} />
      <header className="flex min-w-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
        <BrandLockup
          name={brand.name}
          href="/"
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
          title={t("notFoundTitle")}
          description={t("notFoundBody")}
          actions={
            <>
              <Button variant="primary" href="/dashboard">
                {tc("goToDashboard")}
              </Button>
              <Button href="/login">{ta("signIn")}</Button>
            </>
          }
          hint={t("notFoundHint")}
        />
      </main>
    </div>
  );
}

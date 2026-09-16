import { Icon } from "@/components/kit/icon";
import { BrandLockup } from "@/components/brand/brand-mark";
import { EmptyState } from "@/components/ui";
import { getPlatformBrand } from "@/lib/brand";
import { serverEnv } from "@/lib/env";
import { getTranslations } from "next-intl/server";

export default async function HandleNotFound() {
  const [brand, t] = await Promise.all([getPlatformBrand(), getTranslations("panel")]);
  const home = serverEnv().APP_URL.replace(/\/$/, "") || "/";

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-bg">
      <header className="flex min-w-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
        <BrandLockup name={brand.name} href={home} />
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

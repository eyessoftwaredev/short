import { Icon } from "@/components/kit/icon";
import { getTranslations } from "next-intl/server";
import { BrandLockup } from "@/components/brand/brand-mark";
import { Button, EmptyState } from "@/components/ui";
import { getPlatformBrand } from "@/lib/brand";

export default async function NotFoundPage() {
  const brand = await getPlatformBrand();
  const t = await getTranslations("errors");
  const tc = await getTranslations("common");
  const ta = await getTranslations("auth");

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-bg">
      <header className="flex min-w-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
        <BrandLockup name={brand.name} href="/" />
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

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/brand/brand-mark";
import { BrandPreload } from "@/components/brand/brand-preload";
import { ThemeToggle } from "@/components/landing/theme-toggle";
import { Steps } from "@/components/ui";
import { getPlatformBrand } from "@/lib/brand";
import { getBrandLockupSources } from "@/lib/brand-assets";
import { firstWinPath } from "@/lib/draft-link";
import { requireSession } from "@/lib/session";
import { OnboardingForm, OnboardingSignOut } from "./onboarding-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding");
  return { title: t("title") };
}

export default async function OnboardingPage() {
  const [context, brand, t, brandSources] = await Promise.all([
    requireSession(),
    getPlatformBrand(),
    getTranslations("onboarding"),
    getBrandLockupSources(),
  ]);

  if (context.workspace) {
    redirect(await firstWinPath());
  }

  const suggestion = context.user.name.trim() || (context.user.email.split("@")[0] ?? "");

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BrandPreload sources={brandSources} />
      <header className="border-b border-border-subtle bg-bg">
        <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
          <BrandLockup
            name={brand.name}
            href="/"
            logoSrc={brandSources.logoSrc}
            wordmarkSrc={brandSources.wordmarkSrc}
            hasWordmark={brandSources.hasWordmark}
          />
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="hidden min-w-0 truncate text-[13px] text-fg-muted sm:inline">
              {t("signedInAs")} <span className="font-medium text-ink">{context.user.email}</span>
            </span>
            <OnboardingSignOut label={t("notYou")} />
            <ThemeToggle />
          </span>
        </div>
      </header>

      <main id="main" className="flex min-w-0 flex-1 justify-center px-5 py-10 sm:px-6 sm:py-14">
        <div className="flex w-full max-w-2xl min-w-0 flex-col gap-8">
          <Steps
            current="workspace"
            steps={[
              { id: "account", label: t("stepAccount"), done: true },
              { id: "email", label: t("stepEmail"), done: true },
              { id: "workspace", label: t("stepWorkspace") },
            ]}
          />
          <div className="flex min-w-0 flex-col gap-2">
            <p className="m-0 text-[13px] font-medium text-accent-ink">{t("eyebrow")}</p>
            <h1 className="m-0 text-2xl leading-tight font-semibold tracking-tight text-ink sm:text-3xl">
              {t("title")}
            </h1>
            <p className="m-0 max-w-prose text-[15px] leading-relaxed text-fg-muted">{t("description")}</p>
          </div>

          <OnboardingForm suggestion={suggestion} />
        </div>
      </main>
    </div>
  );
}

import type { Metadata } from "next";
import { Icon, type IconName } from "@/components/kit/icon";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/brand/brand-mark";
import { BrandPreload } from "@/components/brand/brand-preload";
import { getPlatformBrand } from "@/lib/brand";
import { getBrandLockupSources } from "@/lib/brand-assets";
import { firstWinPath } from "@/lib/draft-link";
import { requireSession } from "@/lib/session";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Create your account" };

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
  const steps: ReadonlyArray<{ id: string; href: string; icon: IconName; title: string; body: string }> = [
    { id: "links", href: "/links/new", icon: "link", title: t("stepLinksTitle"), body: t("stepLinksBody") },
    { id: "qr", href: "/qr", icon: "qrcode", title: t("stepQrTitle"), body: t("stepQrBody") },
    { id: "bio", href: "/bio", icon: "address-card", title: t("stepBioTitle"), body: t("stepBioBody") },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-surface-subtle">
      <BrandPreload sources={brandSources} />
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-bg px-6 py-4">
        <BrandLockup
          name={brand.name}
          href="/"
          logoSrc={brandSources.logoSrc}
          wordmarkSrc={brandSources.wordmarkSrc}
          hasWordmark={brandSources.hasWordmark}
        />
        <span className="min-w-0 truncate text-sm text-fg-muted">
          {t("signedInAs")} <span className="text-ink">{context.user.email}</span>
        </span>
      </header>

      <main className="flex min-w-0 flex-1 justify-center px-6 py-12">
        <div className="flex w-full max-w-xl min-w-0 flex-col gap-8">
          <div className="flex min-w-0 flex-col gap-2">
            <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
              {t("eyebrow")}
            </span>
            <h1 className="m-0 text-3xl leading-tight font-semibold tracking-tight">{t("title")}</h1>
            <p className="m-0 max-w-prose text-base leading-relaxed text-fg-muted">{t("description")}</p>
          </div>

          <OnboardingForm suggestion={suggestion} />

          <section className="flex min-w-0 flex-col gap-4">
            <h2 className="m-0 font-mono text-xs tracking-widest text-fg-subtle uppercase">
              {t("nextTitle")}
            </h2>
            <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
              {steps.map((step) => (
                <li key={step.id} className="flex min-w-0 items-start gap-3.5">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-default border border-border bg-bg text-fg-muted"
                    aria-hidden="true"
                  >
                    <Icon name={step.icon} className="text-sm" />
                  </span>
                  <Link href={step.href} className="flex min-w-0 flex-col gap-0.5 no-underline">
                    <span className="text-sm font-medium text-ink">{step.title}</span>
                    <span className="text-sm leading-relaxed text-fg-muted">{step.body}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}

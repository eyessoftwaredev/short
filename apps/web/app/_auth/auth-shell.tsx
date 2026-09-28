import { Icon } from "@/components/kit/icon";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { BrandLockup } from "@/components/brand/brand-mark";
import { BrandPreload } from "@/components/brand/brand-preload";
import { LocaleSwitcher } from "@/components/brand/locale-switcher";
import { ThemeToggle } from "@/components/landing/theme-toggle";
import { getPlatformBrand } from "@/lib/brand";
import { getBrandLockupSources } from "@/lib/brand-assets";
import { serverEnv } from "@/lib/env";

export type AuthHighlight = {
  id: string;
  icon: ReactNode;
  title: string;
  body: string;
};

type AuthShellProps = {
  /** The promise this specific screen makes — login, register and reset each say something different. */
  railTitle: string;
  railBody: string;
  highlights: readonly AuthHighlight[];
  /** Escape hatch in the header for someone who landed on the wrong screen. */
  crossLink: { prompt: string; label: string; href: string };
  children: ReactNode;
};

function demoHost(fallback: string): string {
  try {
    return serverEnv().PLATFORM_SHORT_DOMAIN;
  } catch {
    return fallback;
  }
}

/**
 * Split auth layout: an always-dark brand panel on wide screens (what the
 * product does, in the words of this particular screen) and the form column.
 * On phones the panel collapses away and the form comes first.
 */
export async function AuthShell({ railTitle, railBody, highlights, crossLink, children }: AuthShellProps) {
  const [brand, t, tl, brandSources, brandSourcesInvert] = await Promise.all([
    getPlatformBrand(),
    getTranslations("auth"),
    getTranslations("legal"),
    getBrandLockupSources(false),
    getBrandLockupSources(true),
  ]);
  const host = demoHost(brand.name.replace(/\s+/g, "").toLowerCase());

  return (
    <div className="grid min-h-screen grid-cols-1 bg-bg lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <BrandPreload sources={brandSources} />
      <aside className="relative isolate hidden min-w-0 flex-col justify-between gap-10 overflow-hidden bg-inverse p-10 text-on-inverse lg:flex xl:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 [background-image:linear-gradient(to_right,var(--on-inverse-soft)_1px,transparent_1px),linear-gradient(to_bottom,var(--on-inverse-soft)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_80%_60%_at_20%_0%,black,transparent)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-24 -z-10 size-[520px] rounded-full bg-[radial-gradient(circle,var(--accent),transparent_65%)] opacity-25"
        />
        <BrandLockup
          name={brand.name}
          invert
          href="/"
          logoSrc={brandSourcesInvert.logoSrc}
          wordmarkSrc={brandSourcesInvert.wordmarkSrc}
          hasWordmark={brandSourcesInvert.hasWordmark}
        />

        <div className="flex min-w-0 flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h2 className="m-0 max-w-md text-3xl leading-tight font-semibold tracking-tight text-balance">{railTitle}</h2>
            <p className="m-0 max-w-md text-base leading-relaxed text-on-inverse-dim">{railBody}</p>
          </div>

          <ul className="m-0 flex list-none flex-col gap-5 p-0">
            {highlights.map((item) => (
              <li key={item.id} className="flex min-w-0 items-start gap-3.5">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-default border border-on-inverse-border bg-on-inverse-soft text-on-inverse"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="text-sm leading-relaxed text-on-inverse-dim">{item.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div
          aria-hidden="true"
          className="flex min-w-0 flex-col gap-3 rounded-lg border border-on-inverse-border bg-on-inverse-soft p-4 backdrop-blur"
        >
          <span className="text-xs font-medium text-on-inverse-dim">{t("demoCaption")}</span>
          <div className="flex min-w-0 items-center gap-2.5">
            <Icon name="link" className="text-xs text-on-inverse-dim" />
            <span className="shrink-0 font-mono text-sm">{host}/launch</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {[
              { icon: "apple" as const, rule: "iOS", to: "apps.apple.com/app/acme" },
              { icon: "earth" as const, rule: "TR", to: "acme.com/tr" },
              { icon: "globe" as const, rule: "*", to: "acme.com/launch" },
            ].map((row) => (
              <span key={row.rule} className="flex min-w-0 items-center gap-2 font-mono text-xs text-on-inverse-dim">
                <Icon name={row.icon} className="text-[11px]" />
                <span className="w-7 shrink-0 text-on-inverse">{row.rule}</span>
                <Icon name="arrow-right" className="text-[9px]" />
                <span className="min-w-0 truncate">{row.to}</span>
              </span>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="flex min-w-0 items-center justify-between gap-3 px-5 py-4 sm:px-8 lg:px-10 lg:py-6">
          <span className="lg:hidden">
            <BrandLockup
              name={brand.name}
              href="/"
              logoSrc={brandSources.logoSrc}
              wordmarkSrc={brandSources.wordmarkSrc}
              hasWordmark={brandSources.hasWordmark}
            />
          </span>
          <span className="ml-auto flex min-w-0 items-center gap-1.5">
            <ThemeToggle />
            {brand.localeSwitcherEnabled ? (
              <span className="hidden sm:inline-flex">
                <LocaleSwitcher />
              </span>
            ) : null}
            <p className="m-0 ml-2 flex shrink-0 items-center gap-1.5 text-sm text-fg-muted">
              <span className="hidden sm:inline">{crossLink.prompt}</span>
              <Link href={crossLink.href} className="font-medium">
                {crossLink.label}
              </Link>
            </p>
          </span>
        </header>

        <main id="main" className="flex min-w-0 flex-1 items-start justify-center px-5 pt-6 pb-10 sm:px-8 sm:pt-12 lg:items-center lg:px-10 lg:py-8">
          <div className="flex w-full max-w-[25rem] min-w-0 flex-col gap-6">{children}</div>
        </main>

        <footer className="flex min-w-0 flex-wrap items-center justify-center gap-x-4 gap-y-2 px-5 py-6 text-xs text-fg-subtle sm:px-8 lg:justify-between lg:px-10">
          <span>
            © {new Date().getFullYear()} {brand.name}
          </span>
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {brand.localeSwitcherEnabled ? (
              <span className="sm:hidden">
                <LocaleSwitcher />
              </span>
            ) : null}
            <Link href="/terms" className="text-fg-subtle hover:text-ink">
              {tl("termsTitle")}
            </Link>
            <Link href="/privacy" className="text-fg-subtle hover:text-ink">
              {tl("privacyTitle")}
            </Link>
            <Link href="/cookies" className="text-fg-subtle hover:text-ink">
              {tl("cookiesTitle")}
            </Link>
          </span>
        </footer>
      </div>
    </div>
  );
}

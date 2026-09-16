import { Icon } from "@/components/kit/icon";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { BrandLockup } from "@/components/brand/brand-mark";
import { LocaleSwitcher } from "@/components/brand/locale-switcher";
import { getPlatformBrand } from "@/lib/brand";

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

export async function AuthShell({
  railTitle,
  railBody,
  highlights,
  crossLink,
  children,
}: AuthShellProps) {
  const [brand, t] = await Promise.all([getPlatformBrand(), getTranslations("auth")]);

  return (
    <div className="grid min-h-screen grid-cols-1 bg-bg lg:grid-cols-5">
      <aside className="hidden min-w-0 flex-col justify-between gap-10 border-r border-on-inverse-border bg-inverse p-12 text-on-inverse lg:col-span-2 lg:flex">
        <BrandLockup name={brand.name} invert href="/" />

        <div className="flex min-w-0 flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h2 className="m-0 text-3xl leading-tight font-semibold tracking-tight text-balance">
              {railTitle}
            </h2>
            <p className="m-0 max-w-prose text-base leading-relaxed text-on-inverse-dim">
              {railBody}
            </p>
          </div>

          <ul className="m-0 flex list-none flex-col gap-5 p-0">
            {highlights.map((item) => (
              <li key={item.id} className="flex min-w-0 items-start gap-3.5">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-default bg-on-inverse-soft text-on-inverse"
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

        <div className="flex min-w-0 flex-col gap-3 rounded-default border border-on-inverse-border bg-on-inverse-soft p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs tracking-widest text-on-inverse-dim uppercase">
              {t("demoCaption")}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="shrink-0 font-mono text-sm">
              {brand.name.replace(/\s+/g, "").toLowerCase()}/launch
            </span>
            <Icon name="arrow-right" className="text-xs shrink-0 text-on-inverse-dim" aria-hidden="true" />
            <span className="min-w-0 truncate font-mono text-sm text-on-inverse-dim">
              acme.com/pricing
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["TR → /tr", "iOS → App Store", "Rest → /pricing"].map((rule) => (
              <span
                key={rule}
                className="rounded-pill border border-on-inverse-border px-2.5 py-1 font-mono text-xs text-on-inverse-dim"
              >
                {rule}
              </span>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col lg:col-span-3">
        <header className="flex min-w-0 items-center justify-between gap-4 border-b border-border px-6 py-4 lg:border-b-0 lg:px-10 lg:py-6">
          <span className="lg:hidden">
            <BrandLockup name={brand.name} href="/" />
          </span>
          <span className="ml-auto flex min-w-0 items-center gap-3">
            {brand.localeSwitcherEnabled ? <LocaleSwitcher /> : null}
            <p className="m-0 flex shrink-0 items-center gap-1.5 text-sm text-fg-muted">
              <span className="hidden sm:inline">{crossLink.prompt}</span>
              <Link href={crossLink.href} className="font-medium">
                {crossLink.label}
              </Link>
            </p>
          </span>
        </header>

        <main className="flex min-w-0 flex-1 items-center justify-center px-6 py-10 lg:px-10 lg:py-6">
          <div className="flex w-full max-w-md min-w-0 flex-col gap-6">{children}</div>
        </main>

        <footer className="flex min-w-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 px-6 py-6 text-xs text-fg-subtle lg:justify-end lg:px-10">
          <span>
            © {new Date().getFullYear()} {brand.name}
          </span>
          {brand.tagline ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{brand.tagline}</span>
            </>
          ) : null}
          <span aria-hidden="true">·</span>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/cookies">Cookies</Link>
        </footer>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Icon, type IconName } from "@/components/kit/icon";
import { BrandLockup } from "@/components/brand/brand-mark";
import { LocaleSwitcher } from "@/components/brand/locale-switcher";
import { ShortenForm } from "@/components/landing/shorten-form";
import type { PlatformBrand } from "@/lib/brand-fallback";
import { panelUrl } from "@/lib/public-url";
import type { getTranslations } from "next-intl/server";

type LandingT = Awaited<ReturnType<typeof getTranslations<"landing">>>;

type HomeLandingProps = {
  brand: PlatformBrand;
  t: LandingT;
  signedIn?: boolean;
};

export function HomeLanding({ brand, t, signedIn = false }: HomeLandingProps) {
  const loginHref = panelUrl("/login");
  const registerHref = panelUrl("/register");
  const panelHref = panelUrl("/dashboard");
  const signInHref = signedIn ? panelHref : loginHref;
  const startHref = signedIn ? panelHref : registerHref;
  const signInLabel = signedIn ? t("openPanel") : t("ctaSecondary");
  const startLabel = signedIn ? t("openPanel") : t("ctaStart");
  const demoSlug = `${brand.name.toLowerCase()}/app`;
  const features: ReadonlyArray<{
    id: string;
    href: string;
    icon: IconName;
    title: string;
    body: string;
  }> = [
    { id: "targeting", href: "#route", icon: "bullseye", title: t("featureTargetingTitle"), body: t("featureTargetingBody") },
    { id: "bio", href: "#bio", icon: "address-card", title: t("featureBioTitle"), body: t("featureBioBody") },
    { id: "qr", href: "#features", icon: "qrcode", title: t("featureQrTitle"), body: t("featureQrBody") },
    { id: "analytics", href: "#features", icon: "chart-line", title: t("featureAnalyticsTitle"), body: t("featureAnalyticsBody") },
    { id: "slug", href: "#features", icon: "link", title: t("featureSlugTitle"), body: t("featureSlugBody") },
    { id: "domain", href: "#features", icon: "globe", title: t("featureDomainTitle"), body: t("featureDomainBody") },
    { id: "api", href: "#api", icon: "code", title: t("featureApiTitle"), body: t("featureApiBody") },
  ];

  const stats = [
    { id: "links", value: t("statLinksValue"), label: t("statLinks") },
    { id: "clicks", value: t("statClicksValue"), label: t("statClicks") },
    { id: "uptime", value: t("statUptimeValue"), label: t("statUptime") },
    { id: "api", value: t("statApiValue"), label: t("statApi") },
  ] as const;

  const routeBullets = [t("routeBullet1"), t("routeBullet2"), t("routeBullet3"), t("routeBullet4")];
  const bioBullets = [t("bioBullet1"), t("bioBullet2"), t("bioBullet3")];

  return (
    <div className="eyesone flex min-h-screen min-w-0 flex-col bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-bg">
        <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 flex-wrap items-center gap-6">
            <BrandLockup name={brand.name} />
            <nav className="hidden items-center gap-1 md:flex" aria-label={brand.name}>
              <a className="kit-btn kit-btn--ghost kit-btn--sm" href="#features">
                {t("navFeatures")}
              </a>
              <a className="kit-btn kit-btn--ghost kit-btn--sm" href="#route">
                {t("navRoute")}
              </a>
              <a className="kit-btn kit-btn--ghost kit-btn--sm" href="#api">
                {t("navApi")}
              </a>
              <Link className="kit-btn kit-btn--ghost kit-btn--sm" href="/pricing">
                {t("navPricing")}
              </Link>
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            {brand.localeSwitcherEnabled ? <LocaleSwitcher /> : null}
            {signedIn ? (
              <Link className="kit-btn kit-btn--primary" href={panelHref}>
                {t("openPanel")}
              </Link>
            ) : (
              <>
                <Link className="kit-btn kit-btn--ghost" href={loginHref}>
                  {t("ctaSecondary")}
                </Link>
                <Link className="kit-btn kit-btn--primary hidden sm:inline-flex" href={registerHref}>
                  {t("ctaStart")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex min-w-0 flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-6xl min-w-0 flex-col items-center gap-6 px-6 py-16 text-center md:py-20">
          <p className="m-0 font-mono text-xs tracking-widest text-accent-ink uppercase">{t("eyebrow")}</p>
          <h1 className="m-0 max-w-3xl text-4xl leading-tight font-semibold tracking-tight text-balance md:text-5xl">
            {t("titleLine1")}
            <br />
            {t("titleLine2")}
          </h1>
          <p className="m-0 max-w-2xl text-base leading-relaxed text-fg-muted md:text-lg">{t("description")}</p>
          <ShortenForm placeholder={t("shortenPlaceholder")} submit={t("shortenSubmit")} />
          <p className="m-0 max-w-xl text-sm text-fg-subtle">{t("shortenHint")}</p>
        </section>

        <section className="border-y border-border">
          <div className="mx-auto grid w-full max-w-6xl min-w-0 grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.id} className="flex min-w-0 flex-col items-center gap-1 text-center">
                <span className="numeric text-3xl font-semibold tracking-tight md:text-4xl">{stat.value}</span>
                <span className="text-sm text-fg-muted">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-10 px-6 py-16">
          <div className="flex min-w-0 flex-col items-center gap-3 text-center">
            <p className="m-0 font-mono text-xs tracking-widest text-accent-ink uppercase">
              {t("whyEyebrow", { name: brand.name })}
            </p>
            <h2 className="m-0 max-w-2xl text-3xl leading-tight font-semibold tracking-tight">{t("whyTitle")}</h2>
          </div>
          <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 md:grid-cols-3">
            {features.map((feature) => (
                <article key={feature.id} className="kit-orbit">
                  <div className="kit-orbit__body">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-default bg-accent-surface text-accent-ink">
                      <Icon name={feature.icon} className="text-sm" />
                    </span>
                    <h3 className="m-0 text-lg font-semibold tracking-tight">{feature.title}</h3>
                    <p className="m-0 flex-1 text-sm leading-relaxed text-fg-muted">{feature.body}</p>
                    <a href={feature.href} className="mt-auto inline-flex items-center gap-2 text-sm font-medium">
                      {t("inspect")}
                      <Icon name="arrow-right" className="text-xs" />
                    </a>
                  </div>
                </article>
            ))}
          </div>
        </section>

        <section id="route" className="border-t border-border">
          <div className="mx-auto grid w-full max-w-6xl min-w-0 grid-cols-1 items-center gap-10 px-6 py-16 lg:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-5">
              <p className="m-0 font-mono text-xs tracking-widest text-accent-ink uppercase">{t("routeEyebrow")}</p>
              <h2 className="m-0 text-3xl leading-tight font-semibold tracking-tight">{t("routeTitle")}</h2>
              <p className="m-0 max-w-prose text-base leading-relaxed text-fg-muted">{t("routeBody")}</p>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {routeBullets.map((item) => (
                  <li key={item} className="flex min-w-0 items-start gap-3 text-sm leading-relaxed">
                    <Icon name="check" className="mt-0.5 shrink-0 text-sm text-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div>
                <Link className="kit-btn kit-btn--primary" href={startHref}>
                  {signedIn ? t("openPanel") : t("routeCta")}
                </Link>
              </div>
            </div>
            <article className="kit-card kit-card--static">
              <span className="kit-card__label">{t("routeDemo")}</span>
              <span className="font-mono text-base text-accent-ink">{demoSlug}</span>
              <div className="mt-2 flex flex-col gap-2.5">
                <div className="flex min-w-0 items-center justify-between gap-3 rounded-default bg-surface px-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <Icon name="apple" className="shrink-0 text-sm text-fg-subtle" />
                    iOS
                  </span>
                  <span className="truncate font-mono text-xs text-fg-muted">apps.apple.com</span>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-3 rounded-default bg-surface px-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <Icon name="android" className="shrink-0 text-sm text-fg-subtle" />
                    Android
                  </span>
                  <span className="truncate font-mono text-xs text-fg-muted">play.google.com</span>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-3 rounded-default bg-surface px-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <Icon name="globe" className="shrink-0 text-sm text-fg-subtle" />
                    Web
                  </span>
                  <span className="truncate font-mono text-xs text-fg-muted">acme.com</span>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section id="bio" className="border-t border-border">
          <div className="mx-auto grid w-full max-w-6xl min-w-0 grid-cols-1 items-center gap-10 px-6 py-16 lg:grid-cols-2">
            <article className="kit-card kit-card--static order-2 lg:order-1">
              <div className="flex flex-col items-center gap-3 text-center">
                <span className="flex size-14 items-center justify-center rounded-pill bg-inverse font-semibold text-on-inverse">
                  {brand.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <strong className="text-base font-semibold">{brand.name}</strong>
                  <span className="text-sm text-fg-muted">{t("bioRole")}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {["Instagram", "YouTube", "Site"].map((label) => (
                  <span
                    key={label}
                    className="rounded-default border border-border bg-surface px-3 py-2.5 text-center text-sm"
                  >
                    {label}
                  </span>
                ))}
              </div>
              <span className="text-center font-mono text-xs text-fg-subtle">
                {brand.name.toLowerCase()}/ada
              </span>
            </article>
            <div className="order-1 flex min-w-0 flex-col gap-5 lg:order-2">
              <p className="m-0 font-mono text-xs tracking-widest text-accent-ink uppercase">{t("bioEyebrow")}</p>
              <h2 className="m-0 text-3xl leading-tight font-semibold tracking-tight">{t("bioTitle")}</h2>
              <p className="m-0 max-w-prose text-base leading-relaxed text-fg-muted">{t("bioBody")}</p>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {bioBullets.map((item) => (
                  <li key={item} className="flex min-w-0 items-start gap-3 text-sm leading-relaxed">
                    <Icon name="check" className="mt-0.5 shrink-0 text-sm text-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div>
                <Link className="kit-btn kit-btn--primary" href={startHref}>
                  {signedIn ? t("openPanel") : t("bioCta")}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="api" className="border-t border-border bg-inverse text-on-inverse">
          <div className="mx-auto grid w-full max-w-6xl min-w-0 grid-cols-1 items-center gap-10 px-6 py-16 lg:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-5">
              <p className="m-0 font-mono text-xs tracking-widest text-on-inverse-dim uppercase">{t("apiEyebrow")}</p>
              <h2 className="m-0 text-3xl leading-tight font-semibold tracking-tight">{t("apiTitle")}</h2>
              <p className="m-0 max-w-prose text-base leading-relaxed text-on-inverse-dim">{t("apiBody")}</p>
              <div>
                <Link className="kit-btn kit-btn--primary" href={startHref}>
                  {signedIn ? t("openPanel") : t("apiCta")}
                </Link>
              </div>
            </div>
            <pre className="m-0 min-w-0 overflow-x-auto rounded-default bg-on-inverse-soft p-5 font-mono text-xs leading-relaxed text-on-inverse">
              {`curl -X POST ${t("apiPath")} \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"url":"https://acme.com","slug":"launch"}'`}
            </pre>
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-6xl min-w-0 flex-col items-center gap-5 px-6 py-16 text-center">
          <p className="m-0 font-mono text-xs tracking-widest text-accent-ink uppercase">{t("ctaHeroEyebrow")}</p>
          <h2 className="m-0 max-w-2xl text-3xl leading-tight font-semibold tracking-tight">{t("ctaHeroTitle")}</h2>
          <p className="m-0 max-w-prose text-base leading-relaxed text-fg-muted">{t("ctaHeroDesc")}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link className="kit-btn kit-btn--primary kit-btn--lg" href={startHref}>
              {startLabel}
            </Link>
            {signedIn ? null : (
              <Link className="kit-btn kit-btn--lg" href={signInHref}>
                {signInLabel}
              </Link>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-wrap items-start justify-between gap-8 px-6 py-10">
          <div className="flex min-w-0 flex-col gap-2">
            <BrandLockup name={brand.name} />
            <span className="text-sm text-fg-muted">{t("footerRights")}</span>
          </div>
          <div className="flex min-w-0 flex-col gap-2 text-sm">
            <span className="font-medium">{t("footerProduct")}</span>
            <a href="#features">{t("navFeatures")}</a>
            <a href="#route">{t("navRoute")}</a>
            <a href="#api">{t("navApi")}</a>
            <Link href="/pricing">{t("navPricing")}</Link>
            {signedIn ? (
              <Link href={panelHref}>{t("openPanel")}</Link>
            ) : (
              <>
                <Link href={loginHref}>{t("ctaSecondary")}</Link>
                <Link href={registerHref}>{t("ctaStart")}</Link>
              </>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-2 text-sm">
            <span className="font-medium">{t("footerLegal")}</span>
            <Link href="/terms">{t("footerTerms")}</Link>
            <Link href="/privacy">{t("footerPrivacy")}</Link>
            <Link href="/cookies">{t("footerCookies")}</Link>
          </div>
          <span className="text-sm text-fg-subtle">© {new Date().getFullYear()} {brand.name}</span>
        </div>
      </footer>
    </div>
  );
}

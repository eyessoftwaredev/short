import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Icon, type IconName } from "@/components/kit/icon";
import {
  AnalyticsVisual,
  ApiVisual,
  BioVisual,
  DomainsVisual,
  HeroPreview,
  OpenInAppVisual,
  QrVisual,
  TargetingVisual,
  TeamsVisual,
} from "@/components/landing/landing-visuals";
import { ShortenForm } from "@/components/landing/shorten-form";
import { Button } from "@/components/ui";
import type { BrandLockupSources } from "@/lib/brand-assets";
import { panelUrl } from "@/lib/public-url";
import { cn } from "@/lib/cx";

type HomeLandingProps = {
  brandSources: BrandLockupSources;
  signedIn: boolean;
  /** Platform short domain, e.g. `short.ky` — used in the illustrations. */
  shortHost: string;
  /** Public site origin, encoded into the demo QR code. */
  siteOrigin: string;
  /** `https://app…/api/v1`, shown in the API illustration. */
  apiBase: string;
};

/** The ten apps `openMode: "app"` knows (packages/core/src/open-mode.ts); icons exist for eight. */
const APP_STRIP: ReadonlyArray<{ icon: IconName; name: string }> = [
  { icon: "youtube", name: "YouTube" },
  { icon: "instagram", name: "Instagram" },
  { icon: "tiktok", name: "TikTok" },
  { icon: "whatsapp", name: "WhatsApp" },
  { icon: "x-twitter", name: "X" },
  { icon: "facebook", name: "Facebook" },
  { icon: "linkedin", name: "LinkedIn" },
  { icon: "telegram", name: "Telegram" },
];

function regionName(locale: string, code: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export async function HomeLanding({
  brandSources,
  signedIn,
  shortHost,
  siteOrigin,
  apiBase,
}: HomeLandingProps) {
  const [t, locale] = await Promise.all([getTranslations("landing"), getLocale()]);
  const startHref = panelUrl(signedIn ? "/dashboard" : "/register");
  const startLabel = signedIn ? t("openPanel") : t("ctaStart");
  const numbers = new Intl.NumberFormat(locale);

  const heroCountries = [
    { code: "TR", share: 46 },
    { code: "DE", share: 21 },
    { code: "US", share: 14 },
  ].map((row) => ({ ...row, name: regionName(locale, row.code) }));

  const stats = (["signals", "apps", "reprints", "account"] as const).map((id) => ({
    id,
    value: t(`stats.${id}.value`),
    label: t(`stats.${id}.label`),
    detail: t(`stats.${id}.detail`),
  }));

  const steps: ReadonlyArray<{ id: string; icon: IconName }> = [
    { id: "paste", icon: "link" },
    { id: "customize", icon: "sliders" },
    { id: "share", icon: "chart-line" },
  ];

  const faqIds = ["free", "edit", "openInApp", "domain", "targeting", "bots", "teams", "api"] as const;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden border-b border-border-subtle pb-16 sm:pb-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 [background-image:linear-gradient(to_right,var(--border-subtle)_1px,transparent_1px),linear-gradient(to_bottom,var(--border-subtle)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,black_30%,transparent_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-[560px] bg-[radial-gradient(ellipse_55%_50%_at_50%_30%,var(--accent-surface),transparent_70%)]"
        />
        <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col items-center gap-6 px-4 pt-14 pb-12 text-center sm:px-6 sm:pt-20 lg:pt-24">
          <a
            href="#open-in-app"
            className="group inline-flex max-w-full items-center gap-2 rounded-pill border border-accent-border bg-bg/70 py-1 pr-3 pl-1 text-[13px] font-medium text-ink no-underline shadow-xs backdrop-blur hover:border-accent hover:text-ink hover:no-underline"
          >
            <span className="rounded-pill bg-accent-surface px-2 py-0.5 text-xs text-accent-on-surface">
              {t("hero.badgeTag")}
            </span>
            <span className="min-w-0 truncate">{t("hero.badge")}</span>
            <Icon name="arrow-right" className="text-[10px] text-fg-subtle transition-transform group-hover:translate-x-0.5" />
          </a>
          <h1 className="m-0 max-w-4xl text-[2.5rem] leading-[1.05] font-semibold tracking-tight text-balance text-ink sm:text-6xl lg:text-7xl">
            {t.rich("hero.title", {
              em: (chunks) => <span className="text-accent-ink">{chunks}</span>,
            })}
          </h1>
          <p className="m-0 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">{t("hero.description")}</p>
          <div className="mt-2 flex w-full justify-center">
            <ShortenForm
              claimHref={panelUrl("/register")}
              linksHref={panelUrl("/links")}
              labels={{
                label: t("shorten.label"),
                placeholder: t("shorten.placeholder"),
                submit: t("shorten.submit"),
                hint: t("shorten.hint"),
                empty: t("shorten.empty"),
                resultTitle: t("shorten.resultTitle"),
                copy: t("shorten.copy"),
                copied: t("shorten.copied"),
                open: t("shorten.open"),
                another: t("shorten.another"),
                claimTitle: t("shorten.claimTitle"),
                claimBody: t("shorten.claimBody"),
                claimCta: t("shorten.claimCta"),
                ownedBody: t("shorten.ownedBody"),
                ownedCta: t("shorten.ownedCta"),
                errors: {
                  invalid: t("shorten.errors.invalid"),
                  rate_limited: t("shorten.errors.rateLimited"),
                  quota: t("shorten.errors.quota"),
                  failed: t("shorten.errors.failed"),
                },
              }}
            />
          </div>
          <ul className="m-0 flex list-none flex-wrap justify-center gap-x-5 gap-y-2 p-0 text-[13px] text-fg-muted">
            {(["noCard", "freePlan", "noAccount"] as const).map((id) => (
              <li key={id} className="flex items-center gap-1.5">
                <Icon name="circle-check" className="text-xs text-success" />
                {t(`hero.trust.${id}`)}
              </li>
            ))}
          </ul>
        </div>
        <HeroPreview
          shortHost={shortHost}
          countries={heroCountries}
          copy={{
            total: numbers.format(12480),
            active: t("preview.active"),
            rules: t("preview.rules"),
            clicks: t("preview.clicks"),
            last7: t("preview.last7"),
            topCountries: t("preview.topCountries"),
            otherwise: t("features.targeting.otherwise"),
          }}
        />
      </section>

      {/* ── Apps strip + numbers ─────────────────────────────────────── */}
      <section className="border-b border-border-subtle" aria-labelledby="apps-title">
        <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col items-center gap-6 px-4 py-12 sm:px-6">
          <h2 id="apps-title" className="m-0 text-center text-sm font-medium text-fg-muted">
            {t("apps.title")}
          </h2>
          <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-x-8 gap-y-4 p-0">
            {APP_STRIP.map((app) => (
              <li key={app.name} className="flex items-center gap-2 text-fg-muted">
                <Icon name={app.icon} className="text-xl" />
                <span className="text-sm font-medium">{app.name}</span>
              </li>
            ))}
            <li className="text-sm text-fg-subtle">{t("apps.more")}</li>
          </ul>
        </div>
        <div className="mx-auto grid w-full max-w-6xl min-w-0 grid-cols-2 border-t border-border-subtle lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.id}
              className={cn(
                "flex min-w-0 flex-col gap-1 px-4 py-8 sm:px-6",
                index % 2 === 1 && "border-l border-border-subtle",
                index >= 2 && "border-t border-border-subtle lg:border-t-0",
                index === 2 && "lg:border-l",
              )}
            >
              <span className="numeric text-4xl font-semibold tracking-tight text-ink">{stat.value}</span>
              <span className="text-sm font-medium text-ink">{stat.label}</span>
              <span className="text-[13px] leading-relaxed text-fg-muted">{stat.detail}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="scroll-mt-16 bg-canvas" aria-labelledby="features-title">
        <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-10 px-4 py-20 sm:px-6 lg:py-28">
          <SectionHeading
            id="features-title"
            eyebrow={t("features.eyebrow")}
            title={t("features.title")}
            description={t("features.description")}
          />

          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              id="targeting"
              icon="bullseye"
              title={t("features.targeting.title")}
              body={t("features.targeting.body")}
              className="lg:col-span-2"
              visual={
                <TargetingVisual
                  countryName={regionName(locale, "TR")}
                  copy={{
                    country: t("features.targeting.country"),
                    device: t("features.targeting.device"),
                    os: t("features.targeting.os"),
                    language: t("features.targeting.language"),
                    otherwise: t("features.targeting.otherwise"),
                    caption: t("features.targeting.caption"),
                  }}
                />
              }
            />
            <FeatureCard
              id="open-in-app"
              icon="mobile-screen"
              title={t("features.openInApp.title")}
              body={t("features.openInApp.body")}
              visual={
                <OpenInAppVisual
                  badge={t("features.openInApp.badge")}
                  apps={(
                    [
                      { icon: "youtube", name: "YouTube", url: "youtu.be/dQw4w9WgXcQ" },
                      { icon: "instagram", name: "Instagram", url: "instagram.com/acme" },
                      { icon: "tiktok", name: "TikTok", url: "tiktok.com/@acme" },
                    ] as const
                  ).map((app) => ({ ...app, label: t("features.openInApp.opensIn", { app: app.name }) }))}
                />
              }
            />
            <FeatureCard
              id="qr"
              icon="qrcode"
              title={t("features.qr.title")}
              body={t("features.qr.body")}
              visual={
                <QrVisual
                  url={siteOrigin}
                  caption={t("features.qr.caption")}
                  logoSrc={brandSources.logoSrc}
                  chips={[
                    t("features.qr.chipLogo"),
                    t("features.qr.chipColors"),
                    t("features.qr.chipCaption"),
                    t("features.qr.chipEditable"),
                  ]}
                />
              }
            />
            <FeatureCard
              id="bio"
              icon="address-card"
              title={t("features.bio.title")}
              body={t("features.bio.body")}
              visual={
                <BioVisual
                  name={t("features.bio.demoName")}
                  role={t("features.bio.demoRole")}
                  handle={`${shortHost}/ada`}
                  links={[t("features.bio.demoLink1"), t("features.bio.demoLink2"), t("features.bio.demoLink3")]}
                />
              }
            />
            <FeatureCard
              id="analytics"
              icon="chart-line"
              title={t("features.analytics.title")}
              body={t("features.analytics.body")}
              className="md:col-span-2 lg:col-span-1"
              visual={
                <AnalyticsVisual
                  total={numbers.format(3902)}
                  clicks={t("features.analytics.clicks")}
                  last7={t("preview.last7")}
                  breakdown={[
                    { icon: "mobile-screen", label: t("features.analytics.mobile"), share: 68 },
                    { icon: "desktop", label: t("features.analytics.desktop"), share: 27 },
                    { icon: "tablet", label: t("features.analytics.tablet"), share: 5 },
                  ]}
                />
              }
            />
            <FeatureCard
              id="domains"
              icon="globe"
              title={t("features.domains.title")}
              body={t("features.domains.body")}
              visual={
                <DomainsVisual
                  verified={t("features.domains.verified")}
                  pending={t("features.domains.pending")}
                  https={t("features.domains.https")}
                />
              }
            />
            <FeatureCard
              id="api"
              icon="code"
              title={t("features.api.title")}
              body={t("features.api.body")}
              className="md:col-span-2"
              visual={
                <ApiVisual
                  apiBase={apiBase}
                  shortHost={shortHost}
                  requestLabel={t("features.api.request")}
                  eventLabel={t("features.api.event")}
                />
              }
            />
            <FeatureCard
              id="teams"
              icon="users"
              title={t("features.teams.title")}
              body={t("features.teams.body")}
              className="md:col-span-2 lg:col-span-3 lg:flex-row lg:items-center lg:justify-between"
              visualClassName="lg:w-[26rem] lg:flex-none lg:pt-6"
              visual={
                <TeamsVisual
                  workspaces={[t("features.teams.personal"), t("features.teams.team")]}
                  members={[
                    { initials: "AY", name: "Ayşe Yılmaz", role: t("features.teams.owner") },
                    { initials: "JM", name: "Jonas Müller", role: t("features.teams.admin") },
                    { initials: "SK", name: "Sara Kaya", role: t("features.teams.member") },
                  ]}
                />
              }
            />
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how" className="scroll-mt-16 border-y border-border-subtle" aria-labelledby="how-title">
        <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-12 px-4 py-20 sm:px-6 lg:py-28">
          <SectionHeading
            id="how-title"
            eyebrow={t("how.eyebrow")}
            title={t("how.title")}
            description={t("how.description")}
          />
          <ol className="relative m-0 grid list-none gap-4 p-0 md:grid-cols-3 md:gap-6">
            <span
              aria-hidden="true"
              className="absolute top-6 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-transparent via-border-strong to-transparent md:block"
            />
            {steps.map((step, index) => (
              <li
                key={step.id}
                className="relative flex min-w-0 gap-4 rounded-lg border border-border bg-bg p-5 shadow-card md:flex-col md:items-center md:border-0 md:bg-transparent md:p-0 md:text-center md:shadow-none"
              >
                <span className="relative flex size-12 shrink-0 items-center justify-center rounded-pill border border-accent-border bg-accent-surface text-accent-on-surface md:bg-bg">
                  <Icon name={step.icon} className="text-base" />
                  <span className="numeric absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-pill bg-accent text-[11px] font-semibold text-on-accent">
                    {index + 1}
                  </span>
                </span>
                <span className="flex min-w-0 flex-col gap-1.5">
                  <h3 className="m-0 text-base font-semibold text-ink">{t(`how.${step.id}.title`)}</h3>
                  <p className="m-0 text-sm leading-relaxed text-fg-muted md:max-w-xs">{t(`how.${step.id}.body`)}</p>
                </span>
              </li>
            ))}
          </ol>
          <div className="flex justify-center">
            <Button variant="primary" size="lg" href={startHref} trailingIcon="arrow-right">
              {startLabel}
            </Button>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-16 bg-canvas" aria-labelledby="faq-title">
        <div className="mx-auto grid w-full max-w-6xl min-w-0 gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:py-28">
          <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            <p className="m-0 text-[13px] font-medium text-accent-ink">{t("faq.eyebrow")}</p>
            <h2 id="faq-title" className="m-0 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl">
              {t("faq.title")}
            </h2>
            <p className="m-0 text-base leading-relaxed text-fg-muted">{t("faq.description")}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button href="/pricing" trailingIcon="arrow-right">
                {t("cta.secondary")}
              </Button>
            </div>
          </div>
          <div className="flex min-w-0 flex-col divide-y divide-border rounded-lg border border-border bg-bg shadow-card">
            {faqIds.map((id) => (
              <details key={id} className="group min-w-0 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-medium text-ink select-none hover:bg-surface-subtle">
                  <span className="min-w-0">{t(`faq.items.${id}.q`)}</span>
                  <Icon
                    name="chevron-down"
                    className="text-xs text-fg-subtle transition-transform duration-200 group-open:rotate-180"
                  />
                </summary>
                <p className="m-0 px-5 pb-5 text-sm leading-relaxed text-fg-muted">{t(`faq.items.${id}.a`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6 lg:py-24" aria-labelledby="cta-title">
        <div className="relative isolate mx-auto flex w-full max-w-6xl min-w-0 flex-col items-center gap-5 overflow-hidden rounded-xl bg-inverse px-6 py-14 text-center text-on-inverse sm:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_80%_at_50%_120%,var(--accent),transparent_70%)] opacity-40"
          />
          <h2 id="cta-title" className="m-0 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {t("cta.title")}
          </h2>
          <p className="m-0 max-w-xl text-base leading-relaxed text-on-inverse-dim">{t("cta.description")}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button variant="primary" size="lg" href={startHref} trailingIcon="arrow-right">
              {startLabel}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              href="/pricing"
              className="text-on-inverse hover:bg-on-inverse-soft hover:text-on-inverse"
            >
              {t("cta.secondary")}
            </Button>
          </div>
          <ul className="m-0 flex list-none flex-wrap justify-center gap-x-5 gap-y-2 p-0 text-[13px] text-on-inverse-dim">
            {(["noCard", "freePlan"] as const).map((id) => (
              <li key={id} className="flex items-center gap-1.5">
                <Icon name="check" className="text-xs" />
                {t(`hero.trust.${id}`)}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto flex max-w-2xl min-w-0 flex-col items-center gap-3 text-center">
      <p className="m-0 text-[13px] font-medium text-accent-ink">{eyebrow}</p>
      <h2 id={id} className="m-0 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl">
        {title}
      </h2>
      <p className="m-0 text-base leading-relaxed text-fg-muted sm:text-lg">{description}</p>
    </div>
  );
}

function FeatureCard({
  id,
  icon,
  title,
  body,
  visual,
  className,
  visualClassName,
}: {
  id: string;
  icon: IconName;
  title: string;
  body: string;
  visual: ReactNode;
  className?: string;
  visualClassName?: string;
}) {
  return (
    <article
      id={id}
      className={cn(
        "flex min-w-0 scroll-mt-20 flex-col rounded-xl border border-border bg-bg shadow-card",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-2.5 p-6">
        <span className="flex size-9 items-center justify-center rounded-default bg-accent-surface text-accent-on-surface">
          <Icon name={icon} className="text-sm" />
        </span>
        <h3 className="m-0 pt-1 text-lg font-semibold tracking-tight text-ink">{title}</h3>
        <p className="m-0 max-w-prose text-sm leading-relaxed text-fg-muted">{body}</p>
      </div>
      <div className={cn("flex min-w-0 flex-1 flex-col px-6 pb-6", visualClassName)}>{visual}</div>
    </article>
  );
}

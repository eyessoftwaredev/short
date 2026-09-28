import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Icon } from "@/components/kit/icon";
import { PublicChrome } from "@/components/landing/public-chrome";
import { Callout } from "@/components/ui";
import { cn } from "@/lib/cx";

export type LegalDoc = "terms" | "privacy" | "cookies";

export type LegalSection = {
  id: string;
  title: string;
  body: ReactNode;
};

const DOCS: ReadonlyArray<{ id: LegalDoc; href: string; titleKey: "termsTitle" | "privacyTitle" | "cookiesTitle" }> = [
  { id: "terms", href: "/terms", titleKey: "termsTitle" },
  { id: "privacy", href: "/privacy", titleKey: "privacyTitle" },
  { id: "cookies", href: "/cookies", titleKey: "cookiesTitle" },
];

/**
 * Shared layout for the legal documents: a readable single column (~70
 * characters) with a sticky "on this page" index on wide screens. The body
 * text is English-only; other locales get a notice saying so.
 */
export async function LegalPage({
  doc,
  updated,
  intro,
  sections,
}: {
  doc: LegalDoc;
  /** ISO date (YYYY-MM-DD) of the last substantive change. */
  updated: string;
  intro: ReactNode;
  sections: readonly LegalSection[];
}) {
  const [t, locale] = await Promise.all([getTranslations("legal"), getLocale()]);
  const current = DOCS.find((entry) => entry.id === doc) ?? DOCS[0];
  const updatedLabel = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${updated}T00:00:00Z`),
  );

  return (
    <PublicChrome>
      <header className="border-b border-border-subtle bg-canvas">
        <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-4 px-4 py-12 sm:px-6 sm:py-16">
          <nav aria-label={t("documents")} className="flex flex-wrap gap-1.5">
            {DOCS.map((entry) => (
              <Link
                key={entry.id}
                href={entry.href}
                aria-current={entry.id === doc ? "page" : undefined}
                className={cn(
                  "rounded-pill border px-3 py-1 text-[13px] font-medium no-underline hover:no-underline",
                  entry.id === doc
                    ? "border-accent-border bg-accent-surface text-accent-on-surface hover:text-accent-on-surface"
                    : "border-border bg-bg text-fg-muted hover:border-border-hover hover:text-ink",
                )}
              >
                {t(entry.titleKey)}
              </Link>
            ))}
          </nav>
          <h1 className="m-0 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{t(current.titleKey)}</h1>
          <p className="m-0 flex items-center gap-1.5 text-sm text-fg-muted">
            <Icon name="calendar" className="text-xs" />
            {t("updated")}: <time dateTime={updated}>{updatedLabel}</time>
          </p>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-5xl min-w-0 gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:py-16">
        <aside className="hidden lg:block">
          <nav aria-label={t("onThisPage")} className="sticky top-24 flex flex-col gap-3">
            <p className="m-0 text-[13px] font-medium text-fg-subtle">{t("onThisPage")}</p>
            <ol className="m-0 flex list-none flex-col gap-0.5 border-l border-border p-0">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="-ml-px block border-l border-transparent py-1.5 pl-3 text-[13px] text-fg-muted no-underline hover:border-border-hover hover:text-ink hover:no-underline"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="flex max-w-[70ch] min-w-0 flex-col gap-8">
          {locale !== "en" ? <Callout tone="info">{t("englishOnly")}</Callout> : null}
          <div className="text-[15px] leading-7 text-fg-muted [&_p]:m-0">{intro}</div>
          {sections.map((section, index) => (
            <section key={section.id} id={section.id} className="flex scroll-mt-24 flex-col gap-3">
              <h2 className="m-0 flex items-baseline gap-2.5 text-xl font-semibold tracking-tight text-ink">
                <span className="numeric text-base font-medium text-fg-subtle">{index + 1}.</span>
                {section.title}
              </h2>
              <div className="flex flex-col gap-3 text-[15px] leading-7 text-fg-muted [&_a]:font-medium [&_p]:m-0">
                {section.body}
              </div>
            </section>
          ))}
          <div className="border-t border-border-subtle pt-6">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium">
              <Icon name="arrow-left" className="text-xs" />
              {t("backHome")}
            </Link>
          </div>
        </article>
      </div>
    </PublicChrome>
  );
}

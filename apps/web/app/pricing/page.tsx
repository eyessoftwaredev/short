import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { isInternalPlan } from "@short/core";
import { Icon } from "@/components/kit/icon";
import { PublicChrome } from "@/components/landing/public-chrome";
import { contactEmails } from "@/lib/contact";
import {
  PLAN_FEATURE_ROWS,
  isCustomPriced,
  isFreePlan,
  type PublicPlan,
} from "@/components/landing/pricing-plans";
import { PricingTable } from "@/components/landing/pricing-table";
import { Button, EmptyState } from "@/components/ui";
import { listPlans } from "@/lib/billing";
import { panelUrl } from "@/lib/public-url";
import { getLandingAuthState } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pricing");
  return { title: t("meta.title"), description: t("meta.description") };
}

const MATRIX_LIMITS = [
  ["links", "limitLinks"],
  ["clicksPerMonth", "limitClicks"],
  ["customDomains", "limitDomains"],
  ["qrCodes", "limitQr"],
  ["biopages", "limitBio"],
  ["members", "limitMembers"],
  ["teams", "limitTeams"],
  ["retentionDays", "limitHistory"],
] as const;

const FAQ_IDS = ["switch", "limits", "yearly", "payment", "pooled", "downgrade"] as const;

export default async function PricingPage() {
  const [t, tb, tc, locale, rows, signedIn] = await Promise.all([
    getTranslations("pricing"),
    getTranslations("billing"),
    getTranslations("common"),
    getLocale(),
    listPlans().catch((error: unknown) => {
      console.error("pricing: listPlans failed", error);
      return [];
    }),
    getLandingAuthState(),
  ]);

  const plans: PublicPlan[] = rows
    .filter((row) => !isInternalPlan(row.key))
    .map((row) => ({
      key: row.key,
      name: row.name,
      priceMonthly: row.priceMonthly,
      priceYearly: row.priceYearly,
      currency: row.currency,
      limits: {
        links: row.limits.links,
        clicksPerMonth: row.limits.clicksPerMonth,
        customDomains: row.limits.customDomains,
        biopages: row.limits.biopages,
        qrCodes: row.limits.qrCodes,
        members: row.limits.members,
        teams: row.limits.teams,
        retentionDays: row.limits.retentionDays,
        // Rows written before the API limit existed fall back to the code default.
        apiRequestsPerHour: row.limits.apiRequestsPerHour ?? row.definition.limits.apiRequestsPerHour,
      },
      features: row.features,
    }));

  const popular =
    plans.find((plan) => plan.key === "pro") ??
    plans.find((plan) => !isFreePlan(plan) && !isCustomPriced(plan)) ??
    null;
  const registerHref = panelUrl(signedIn ? "/billing" : "/register");
  const currencies = [...new Set(plans.filter((plan) => !isFreePlan(plan)).map((plan) => plan.currency))];
  const numbers = new Intl.NumberFormat(locale);
  const limitText = (value: number): string => (value === -1 ? tc("unlimited") : numbers.format(value));

  return (
    <PublicChrome>
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-[460px] bg-[radial-gradient(ellipse_55%_50%_at_50%_30%,var(--accent-surface),transparent_70%)]"
        />
        <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-10 px-4 pt-14 pb-16 sm:px-6 sm:pt-20">
          <header className="mx-auto flex max-w-2xl min-w-0 flex-col items-center gap-3 text-center">
            <p className="m-0 text-[13px] font-medium text-accent-ink">{t("eyebrow")}</p>
            <h1 className="m-0 text-4xl leading-tight font-semibold tracking-tight text-balance text-ink sm:text-5xl">
              {t("title")}
            </h1>
            <p className="m-0 text-base leading-relaxed text-fg-muted sm:text-lg">{t("description")}</p>
          </header>

          {plans.length === 0 ? (
            <EmptyState
              icon="credit-card"
              title={t("empty.title")}
              description={t("empty.body")}
              actions={
                <Button variant="primary" href={panelUrl("/register")}>
                  {t("ctaFree")}
                </Button>
              }
            />
          ) : (
            <>
              <PricingTable
                plans={plans}
                registerHref={registerHref}
                popularKey={popular?.key ?? null}
                salesEmail={contactEmails().sales}
              />
              {currencies.length > 0 ? (
                <p className="m-0 text-center text-[13px] text-fg-subtle">
                  {t("note", { currency: currencies.join(", ") })}
                </p>
              ) : null}
            </>
          )}
        </div>
      </section>

      {plans.length > 0 ? (
        <section className="border-t border-border-subtle bg-canvas" aria-labelledby="compare-title">
          <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-8 px-4 py-20 sm:px-6">
            <div className="flex min-w-0 flex-col gap-2">
              <h2 id="compare-title" className="m-0 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                {t("matrix.title")}
              </h2>
              <p className="m-0 text-base text-fg-muted">{t("matrix.description")}</p>
            </div>
            <div className="relative min-w-0 overflow-x-auto rounded-lg border border-border bg-bg shadow-card">
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <caption className="sr-only">{t("matrix.title")}</caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="sticky left-0 z-[1] w-[34%] bg-bg px-5 py-4 text-[13px] font-medium text-fg-subtle">
                      {t("matrix.feature")}
                    </th>
                    {plans.map((plan) => (
                      <th key={plan.key} scope="col" className="px-4 py-4 text-center">
                        <span className="flex flex-col items-center gap-0.5">
                          <span className="text-[15px] font-semibold text-ink">{plan.name}</span>
                          {plan.key === popular?.key ? (
                            <span className="text-xs font-medium text-accent-ink">{t("popular")}</span>
                          ) : null}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <MatrixGroup label={t("matrix.usage")} span={plans.length + 1} />
                  {MATRIX_LIMITS.map(([key, label]) => (
                    <MatrixRow key={key} label={tb(label)}>
                      {plans.map((plan) => (
                        <td key={plan.key} className="numeric px-4 py-3 text-center text-ink">
                          {key === "retentionDays"
                            ? plan.limits.retentionDays === -1
                              ? tc("unlimited")
                              : tc("days", { count: plan.limits.retentionDays })
                            : limitText(plan.limits[key])}
                        </td>
                      ))}
                    </MatrixRow>
                  ))}
                  <MatrixRow label={t("matrix.apiRequests")}>
                    {plans.map((plan) => (
                      <td key={plan.key} className="numeric px-4 py-3 text-center text-ink">
                        {plan.features.apiAccess ? limitText(plan.limits.apiRequestsPerHour) : <Missing label={t("matrix.notIncluded")} />}
                      </td>
                    ))}
                  </MatrixRow>

                  <MatrixGroup label={t("matrix.features")} span={plans.length + 1} />
                  {(["openInApp", "analytics", "qrDynamic", "bioPages"] as const).map((key) => (
                    <MatrixRow key={key} label={t(`always.${key}`)}>
                      {plans.map((plan) => (
                        <td key={plan.key} className="px-4 py-3 text-center">
                          <Included label={t("matrix.included")} />
                        </td>
                      ))}
                    </MatrixRow>
                  ))}
                  {PLAN_FEATURE_ROWS.map(([key, label]) => (
                    <MatrixRow key={key} label={tb(label)}>
                      {plans.map((plan) => (
                        <td key={plan.key} className="px-4 py-3 text-center">
                          {plan.features[key] ? (
                            <Included label={t("matrix.included")} />
                          ) : (
                            <Missing label={t("matrix.notIncluded")} />
                          )}
                        </td>
                      ))}
                    </MatrixRow>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-t border-border-subtle" aria-labelledby="pricing-faq-title">
        <div className="mx-auto grid w-full max-w-6xl min-w-0 gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
            <h2 id="pricing-faq-title" className="m-0 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {t("faq.title")}
            </h2>
            <p className="m-0 text-base leading-relaxed text-fg-muted">{t("faq.description")}</p>
            <div className="pt-2">
              <Button variant="primary" href={panelUrl(signedIn ? "/dashboard" : "/register")} trailingIcon="arrow-right">
                {signedIn ? tc("goToDashboard") : t("ctaFree")}
              </Button>
            </div>
          </div>
          <div className="flex min-w-0 flex-col divide-y divide-border rounded-lg border border-border bg-bg shadow-card">
            {FAQ_IDS.map((id) => (
              <details key={id} className="group min-w-0 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-medium text-ink select-none hover:bg-surface-subtle">
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
    </PublicChrome>
  );
}

function MatrixGroup({ label, span }: { label: string; span: number }) {
  return (
    <tr className="border-b border-border-subtle bg-surface-subtle">
      <th
        scope="colgroup"
        colSpan={span}
        className="sticky left-0 px-5 py-2.5 text-left text-[13px] font-semibold text-ink"
      >
        {label}
      </th>
    </tr>
  );
}

function MatrixRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <tr className="border-b border-border-subtle last:border-0 hover:bg-row-hover">
      <th scope="row" className="sticky left-0 z-[1] bg-bg px-5 py-3 text-left font-normal text-fg-muted">
        {label}
      </th>
      {children}
    </tr>
  );
}

function Included({ label }: { label: string }) {
  return (
    <span className="inline-flex size-6 items-center justify-center rounded-pill bg-success-surface text-success">
      <Icon name="check" className="text-xs" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

function Missing({ label }: { label: string }) {
  return (
    <span className="text-fg-disabled">
      <span aria-hidden="true">—</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

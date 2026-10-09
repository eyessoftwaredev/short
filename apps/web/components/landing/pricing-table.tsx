"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { PlanKey } from "@short/core";
import { Icon } from "@/components/kit/icon";
import { Badge, Button, Segmented } from "@/components/ui";
import { cn } from "@/lib/cx";
import { PLAN_FEATURE_ROWS, isCustomPriced, isFreePlan, type PublicPlan } from "./pricing-plans";

type Interval = "month" | "year";

const CARD_LIMITS = ["links", "clicksPerMonth", "customDomains", "qrCodes", "biopages", "members"] as const;

function formatMoney(minor: number, currency: string, locale: string): string {
  const amount = minor / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/** Largest yearly discount across the paid plans, for the toggle's "Save x%" hint. */
function bestYearlySaving(plans: readonly PublicPlan[]): number {
  let best = 0;
  for (const plan of plans) {
    if (plan.priceMonthly > 0 && plan.priceYearly > 0) {
      const saving = 1 - plan.priceYearly / (plan.priceMonthly * 12);
      best = Math.max(best, saving);
    }
  }
  return Math.round(best * 100);
}

type PricingTableProps = {
  plans: PublicPlan[];
  registerHref: string;
  /** Key of the plan to highlight; usually the first paid plan. */
  popularKey: PlanKey | null;
  /** Custom-priced plans are sold by email rather than self-serve sign-up. */
  salesEmail: string;
};

export function PricingTable({ plans, registerHref, popularKey, salesEmail }: PricingTableProps) {
  const t = useTranslations("pricing");
  const tb = useTranslations("billing");
  const tc = useTranslations("common");
  const locale = useLocale();
  const hasYearly = plans.some((plan) => plan.priceYearly > 0);
  const [interval, setInterval] = useState<Interval>("month");
  const saving = bestYearlySaving(plans);
  const numbers = new Intl.NumberFormat(locale);

  const limitValue = (value: number): string => (value === -1 ? tc("unlimited") : numbers.format(value));

  return (
    <div className="flex min-w-0 flex-col gap-8">
      {hasYearly ? (
        <div className="flex flex-col items-center gap-2">
          <Segmented<Interval>
            label={t("billingLabel")}
            value={interval}
            onChange={setInterval}
            items={[
              { id: "month", label: tc("monthly") },
              {
                id: "year",
                label: (
                  <span className="flex items-center gap-1.5">
                    {tc("yearly")}
                    {saving > 0 ? (
                      <Badge tone="success" size="sm">
                        {t("save", { percent: saving })}
                      </Badge>
                    ) : null}
                  </span>
                ),
                ariaLabel: saving > 0 ? `${tc("yearly")} — ${t("save", { percent: saving })}` : tc("yearly"),
              },
            ]}
          />
        </div>
      ) : null}

      <div
        className={cn(
          "grid min-w-0 items-stretch gap-4",
          plans.length >= 4 ? "md:grid-cols-2 xl:grid-cols-4" : plans.length === 3 ? "lg:grid-cols-3" : "md:grid-cols-2",
        )}
      >
        {plans.map((plan, index) => {
          const free = isFreePlan(plan);
          const custom = isCustomPriced(plan);
          const yearly = interval === "year" && plan.priceYearly > 0;
          const perMonth = yearly ? Math.round(plan.priceYearly / 12) : plan.priceMonthly;
          const popular = plan.key === popularKey;
          const previous = index > 0 ? plans[index - 1] : null;
          const added = PLAN_FEATURE_ROWS.filter(
            ([key]) => plan.features[key] && !(previous?.features[key] ?? false),
          );
          const tagline = t.has(`plans.${plan.key}`) ? t(`plans.${plan.key}`) : null;

          return (
            <article
              key={plan.key}
              className={cn(
                "relative flex min-w-0 flex-col gap-6 rounded-xl border bg-bg p-6 shadow-card",
                popular ? "border-accent shadow-lift ring-1 ring-accent" : "border-border",
              )}
            >
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="m-0 text-lg font-semibold text-ink">{plan.name}</h2>
                  {popular ? (
                    <Badge tone="accent" size="sm">
                      {t("popular")}
                    </Badge>
                  ) : null}
                </div>
                {tagline ? <p className="m-0 text-sm leading-relaxed text-fg-muted md:min-h-[2lh]">{tagline}</p> : null}
              </div>

              <div className="flex min-w-0 flex-col gap-1">
                {custom ? (
                  <p className="m-0 text-4xl font-semibold tracking-tight text-ink">{t("customPrice")}</p>
                ) : (
                  <p className="m-0 flex flex-wrap items-baseline gap-x-1.5">
                    <span className="numeric text-4xl font-semibold tracking-tight text-ink">
                      {free ? formatMoney(0, plan.currency, locale) : formatMoney(perMonth, plan.currency, locale)}
                    </span>
                    <span className="text-sm text-fg-muted">{t("perMonth")}</span>
                  </p>
                )}
                <p className="m-0 min-h-5 text-[13px] text-fg-subtle">
                  {custom
                    ? t("customNote")
                    : free
                      ? t("freeForever")
                      : yearly
                        ? t("billedYearly", { amount: formatMoney(plan.priceYearly, plan.currency, locale) })
                        : t("billedMonthly")}
                </p>
              </div>

              <Button
                variant={popular ? "primary" : "secondary"}
                size="lg"
                block
                href={custom ? `mailto:${salesEmail}` : registerHref}
                trailingIcon={popular ? "arrow-right" : undefined}
              >
                {free ? t("ctaFree") : custom ? t("ctaCustom") : t("ctaPaid", { plan: plan.name })}
              </Button>

              <ul className="m-0 flex list-none flex-col gap-2 border-t border-border-subtle p-0 pt-5 text-sm">
                {CARD_LIMITS.map((key) => (
                  <li key={key} className="flex min-w-0 items-baseline gap-1.5 text-fg-muted">
                    <span className="numeric font-semibold text-ink">{limitValue(plan.limits[key])}</span>
                    <span className="min-w-0">
                      {t(`cardLimits.${key}`, { count: plan.limits[key] === -1 ? 2 : plan.limits[key] })}
                    </span>
                  </li>
                ))}
              </ul>

              {added.length > 0 || index === 0 ? (
                <div className="flex min-w-0 flex-col gap-2.5">
                  <p className="m-0 text-[13px] font-medium text-ink">
                    {previous ? t("everythingIn", { plan: previous.name }) : t("includes")}
                  </p>
                  <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
                    {(index === 0 ? (["openInApp", "analytics", "qrDynamic"] as const) : []).map((key) => (
                      <li key={key} className="flex min-w-0 items-start gap-2 text-fg-muted">
                        <Icon name="check" className="mt-0.5 text-xs text-success" />
                        <span className="min-w-0">{t(`always.${key}`)}</span>
                      </li>
                    ))}
                    {added.map(([key, label]) => (
                      <li key={key} className="flex min-w-0 items-start gap-2 text-fg-muted">
                        <Icon name="check" className="mt-0.5 text-xs text-success" />
                        <span className="min-w-0">{tb(label)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

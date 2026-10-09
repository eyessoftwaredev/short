"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { PlanFeatures, PlanKey } from "@short/core";
import { Icon } from "@/components/kit/icon";
import { Badge, Button, Callout, Card, InfoTip, Segmented } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cx";
import { ManageBillingButton } from "./manage-billing-button";
import { startCheckoutAction } from "./actions";

export type PlanLimitsView = {
  links: number;
  clicksPerMonth: number;
  customDomains: number;
  biopages: number;
  qrCodes: number;
  members: number;
  teams: number;
  retentionDays: number;
};

export type PlanCardView = {
  key: PlanKey;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  limits: PlanLimitsView;
  features: PlanFeatures;
  hasPrice: boolean;
};

type Interval = "month" | "year";

type PlanPickerProps = {
  plans: PlanCardView[];
  currentPlan: PlanKey;
  currentInterval: Interval;
  canManage: boolean;
  hasBillingAccount: boolean;
  stripeConfigured: boolean;
  /** Platform sales mailbox for custom-priced plans. */
  salesEmail: string;
};

const LIMIT_ROWS = [
  ["links", "limitLinks"],
  ["clicksPerMonth", "limitClicks"],
  ["customDomains", "limitDomains"],
  ["biopages", "limitBio"],
  ["qrCodes", "limitQr"],
  ["members", "limitMembers"],
  ["teams", "limitTeams"],
  ["retentionDays", "limitHistory"],
] as const;

const FEATURE_ROWS = [
  ["targeting", "featureTargeting"],
  ["abTesting", "featureAb"],
  ["passwordProtection", "featurePassword"],
  ["cloaking", "featureCloak"],
  ["qrLogo", "featureQrLogo"],
  ["webhooks", "featureWebhooks"],
  ["apiAccess", "featureApi"],
  ["shortSlugs", "featureShortSlugs"],
  ["customCss", "featureCustomCss"],
  ["bioForms", "featureBioForms"],
  ["removeBranding", "featureBranding"],
] as const;

/** `-1` means unlimited, which ranks above every finite limit. */
function rank(limit: number): number {
  return limit === -1 ? Number.POSITIVE_INFINITY : limit;
}

export function PlanPicker({
  plans,
  currentPlan,
  currentInterval,
  canManage,
  hasBillingAccount,
  stripeConfigured,
  salesEmail,
}: PlanPickerProps) {
  const locale = useLocale();
  const t = useTranslations("billing");
  const tc = useTranslations("common");
  const actionMessage = useActionMessage();
  const [interval, setInterval] = useState<Interval>(currentInterval);
  const [pendingPlan, setPendingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentIndex = plans.findIndex((item) => item.key === currentPlan);
  const current = currentIndex >= 0 ? plans[currentIndex] : undefined;

  // The next paid tier up is the only upgrade worth pointing at by default.
  const recommended =
    plans.find((item, index) => index > currentIndex && item.hasPrice && item.priceMonthly > 0)?.key ?? null;

  const discounts = plans
    .filter((item) => item.priceMonthly > 0 && item.priceYearly > 0)
    .map((item) => Math.round((1 - item.priceYearly / (item.priceMonthly * 12)) * 100));
  const bestDiscount = discounts.length > 0 ? Math.max(...discounts) : 0;

  async function checkout(planKey: PlanKey): Promise<void> {
    setError(null);
    setPendingPlan(planKey);
    try {
      const result = await startCheckoutAction(planKey, interval);
      if (!result.ok) {
        setError(actionMessage(result.error));
        setPendingPlan(null);
        return;
      }
      // Leaves the button in its pending state — the tab is navigating to Stripe.
      window.location.href = result.data.url;
    } catch {
      setError(actionMessage("generic"));
      setPendingPlan(null);
    }
  }

  function formatLimitValue(key: (typeof LIMIT_ROWS)[number][0], value: number): string {
    if (value === -1) {
      return tc("unlimited");
    }
    if (key === "retentionDays") {
      return tc("days", { count: value });
    }
    return formatNumber(value, locale);
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Segmented
            label={t("billingInterval")}
            value={interval}
            onChange={setInterval}
            items={[
              { id: "month", label: tc("monthly") },
              {
                id: "year",
                label: (
                  <>
                    {tc("yearly")}
                    {bestDiscount > 0 ? (
                      <span className="numeric text-xs font-semibold text-success-ink">−{bestDiscount}%</span>
                    ) : null}
                  </>
                ),
              },
            ]}
          />
          <InfoTip label={t("billingInterval")}>{t("billingIntervalInfo")}</InfoTip>
        </div>

        {current ? (
          <p className="m-0 min-w-0 text-sm text-fg-muted">
            {currentInterval === "year"
              ? t("youAreOnYearly", { name: current.name })
              : t("youAreOnMonthly", { name: current.name })}
          </p>
        ) : null}
      </div>

      {error ? <Callout tone="danger" title={error} onDismiss={() => setError(null)} /> : null}
      {stripeConfigured ? null : <Callout tone="neutral">{t("plansReferenceOnly")}</Callout>}
      {canManage ? null : <Callout tone="info">{t("ownerChangePlan")}</Callout>}

      {/* Hidden plans (Enterprise) leave three public ones; fill the row instead of an empty fourth slot. */}
      <div
        className={cn(
          "grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2",
          plans.length === 3 ? "xl:grid-cols-3" : "xl:grid-cols-4",
        )}
      >
        {plans.map((plan, index) => {
          const isCurrent = plan.key === currentPlan;
          const isRecommended = plan.key === recommended;
          const isFree = plan.key === "free";
          // A paid tier without prices (Enterprise) is sold by hand, not "free".
          const customPricing = !isFree && plan.priceMonthly === 0 && plan.priceYearly === 0;
          const price = interval === "year" ? plan.priceYearly : plan.priceMonthly;
          const saving = plan.priceMonthly * 12 - plan.priceYearly;
          const higher = index > currentIndex;
          const busy = pendingPlan === plan.key;

          let caption: string;
          if (isFree) {
            caption = t("noCardRequired");
          } else if (customPricing) {
            caption = t("customPricingCaption");
          } else if (interval === "year" && saving > 0) {
            caption = t("savesYear", { amount: formatCurrency(saving, plan.currency) });
          } else {
            caption = interval === "year" ? t("billedYearlyCaption") : t("billedMonthly");
          }

          let action;
          if (isCurrent) {
            action = (
              <Button size="md" block disabled leadingIcon="check">
                {t("currentPlan")}
              </Button>
            );
          } else if (isFree) {
            action =
              canManage && hasBillingAccount ? (
                <ManageBillingButton size="md" block withIcon={false} label={t("downgradeFree")} />
              ) : (
                <Button size="md" block disabled>
                  {t("downgradeFree")}
                </Button>
              );
          } else if (plan.hasPrice && !customPricing) {
            action = (
              <Button
                variant={isRecommended ? "primary" : "secondary"}
                size="md"
                block
                loading={busy}
                disabled={!canManage || !stripeConfigured || (pendingPlan !== null && !busy)}
                onClick={() => {
                  void checkout(plan.key);
                }}
              >
                {busy
                  ? t("openingCheckout")
                  : higher
                    ? t("upgradeTo", { name: plan.name })
                    : t("downgradeTo", { name: plan.name })}
              </Button>
            );
          } else {
            action = (
              <Button size="md" block leadingIcon="envelope" href={`mailto:${salesEmail}`}>
                {t("contactSales")}
              </Button>
            );
          }

          return (
            <Card
              key={plan.key}
              aria-current={isCurrent ? "true" : undefined}
              className={cn(
                "gap-4",
                isCurrent && "border-accent-border bg-accent-tint",
                !isCurrent && isRecommended && "border-accent shadow-lift",
              )}
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <h3 className="m-0 min-w-0 truncate text-[15px] leading-6 font-semibold text-ink">{plan.name}</h3>
                {isCurrent ? (
                  <Badge tone="accent">{tc("current")}</Badge>
                ) : isRecommended ? (
                  <Badge tone="inverse">{tc("recommended")}</Badge>
                ) : null}
              </div>

              <div className="flex min-w-0 flex-col gap-1">
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
                  <span className="numeric text-[28px] leading-9 font-semibold tracking-[-0.02em] text-ink">
                    {isFree ? tc("free") : customPricing ? t("customPricing") : formatCurrency(price, plan.currency)}
                  </span>
                  {isFree || customPricing ? null : (
                    <span className="text-sm text-fg-muted">
                      {interval === "year" ? t("perYear") : t("perMonth")}
                    </span>
                  )}
                </span>
                <span className="numeric text-xs text-fg-subtle">{caption}</span>
              </div>

              <div className="min-w-0">{action}</div>

              <dl className="m-0 grid min-w-0 grid-cols-1 gap-1.5 border-t border-border-subtle pt-4 text-sm">
                {LIMIT_ROWS.map(([key, label]) => {
                  const value = plan.limits[key];
                  const mine = current?.limits[key];
                  const better = mine != null && !isCurrent && rank(value) > rank(mine);
                  const worse = mine != null && !isCurrent && rank(value) < rank(mine);

                  return (
                    <div key={key} className="flex min-w-0 items-center justify-between gap-2">
                      <dt className="min-w-0 truncate text-fg-muted">{t(label)}</dt>
                      <dd
                        className={cn(
                          "numeric m-0 flex shrink-0 items-center gap-1",
                          better ? "font-semibold text-success-ink" : "text-ink",
                          worse && "text-fg-subtle",
                        )}
                      >
                        {better ? (
                          <Icon name="arrow-up" className="shrink-0 text-[10px]" aria-label={t("moreThanPlan")} />
                        ) : null}
                        {worse ? (
                          <Icon name="arrow-down" className="shrink-0 text-[10px]" aria-label={t("lessThanPlan")} />
                        ) : null}
                        {formatLimitValue(key, value)}
                      </dd>
                    </div>
                  );
                })}
              </dl>

              <ul className="m-0 mt-auto flex list-none flex-col gap-1.5 border-t border-border-subtle p-0 pt-4 text-sm">
                {FEATURE_ROWS.map(([key, label]) => {
                  const on = plan.features[key];
                  const gained = on && !isCurrent && current != null && !current.features[key];

                  return (
                    <li
                      key={key}
                      className={cn(
                        "flex min-w-0 items-center gap-2",
                        !on && "text-fg-disabled",
                        on && gained && "font-medium text-ink",
                        on && !gained && "text-fg-muted",
                      )}
                    >
                      {on ? (
                        <Icon
                          name="check"
                          className={cn("shrink-0 text-xs", gained ? "text-success" : "text-fg-subtle")}
                          aria-hidden="true"
                        />
                      ) : (
                        <Icon name="minus" className="shrink-0 text-xs" aria-hidden="true" />
                      )}
                      <span className="min-w-0 truncate">{t(label)}</span>
                      {on ? null : <span className="sr-only">({tc("notInPlan")})</span>}
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>

      <p className="m-0 text-xs leading-relaxed text-fg-subtle">{t("compareHint")}</p>
    </div>
  );
}

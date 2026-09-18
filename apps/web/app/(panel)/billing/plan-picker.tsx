"use client";

import { Icon } from "@/components/kit/icon";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { PlanFeatures, PlanKey } from "@short/core";
import { formatLimit } from "@short/core";
import { Badge, Button, Chip } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { formatCurrency } from "@/lib/format";
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

type PlanPickerProps = {
  plans: PlanCardView[];
  currentPlan: PlanKey;
  currentInterval: "month" | "year";
  canManage: boolean;
  hasBillingAccount: boolean;
  stripeConfigured: boolean;
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
}: PlanPickerProps) {
  const t = useTranslations("billing");
  const tc = useTranslations("common");
  const actionMessage = useActionMessage();
  const [interval, setInterval] = useState<"month" | "year">(currentInterval);
  const [pendingPlan, setPendingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentIndex = plans.findIndex((item) => item.key === currentPlan);
  const current = currentIndex >= 0 ? plans[currentIndex] : undefined;

  // The next paid tier up is the only upgrade worth pointing at by default.
  const recommended =
    plans.find(
      (item, index) => index > currentIndex && item.hasPrice && item.priceMonthly > 0,
    )?.key ?? null;

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

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label={t("billingInterval")}
        >
          <Chip
            active={interval === "month"}
            aria-pressed={interval === "month"}
            onClick={() => setInterval("month")}
          >
            {tc("monthly")}
          </Chip>
          <Chip
            active={interval === "year"}
            aria-pressed={interval === "year"}
            onClick={() => setInterval("year")}
          >
            {tc("yearly")}
            {bestDiscount > 0 ? (
              <span className="font-mono text-xs tabular-nums">−{bestDiscount}%</span>
            ) : null}
          </Chip>
        </div>

        {current ? (
          <p className="m-0 min-w-0 text-sm text-fg-muted">
            {currentInterval === "year"
              ? t("youAreOnYearly", { name: current.name })
              : t("youAreOnMonthly", { name: current.name })}
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="m-0 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {stripeConfigured ? null : (
        <p className="m-0 text-sm text-fg-muted">{t("plansReferenceOnly")}</p>
      )}

      {canManage ? null : (
        <p className="m-0 text-sm text-fg-muted">{t("ownerChangePlan")}</p>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan, index) => {
          const isCurrent = plan.key === currentPlan;
          const isRecommended = plan.key === recommended;
          const price = interval === "year" ? plan.priceYearly : plan.priceMonthly;
          const free = plan.priceMonthly === 0 && plan.priceYearly === 0;
          const saving = plan.priceMonthly * 12 - plan.priceYearly;
          const higher = index > currentIndex;
          const busy = pendingPlan === plan.key;

          return (
            <div
              key={plan.key}
              aria-current={isCurrent ? "true" : undefined}
              className={cn(
                "flex min-w-0 flex-col gap-4 rounded-default border p-5",
                isCurrent && "border-accent bg-accent-tint",
                !isCurrent && isRecommended && "border-border-strong shadow-lift",
                !isCurrent && !isRecommended && "border-border",
              )}
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <span
                  className={cn(
                    "min-w-0 truncate font-mono text-xs tracking-widest uppercase",
                    isCurrent ? "text-accent-ink" : "text-fg-subtle",
                  )}
                >
                  {plan.name}
                </span>
                {isCurrent ? (
                  <Badge tone="accent">{tc("current")}</Badge>
                ) : isRecommended ? (
                  <Badge tone="inverse">{tc("recommended")}</Badge>
                ) : null}
              </div>

              <div className="flex min-w-0 flex-col gap-1">
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
                  <span className="text-3xl leading-tight font-semibold tracking-tight tabular-nums">
                    {free ? tc("free") : formatCurrency(price, plan.currency)}
                  </span>
                  {free ? null : (
                    <span className="text-sm text-fg-muted">
                      {interval === "year" ? t("perYear") : t("perMonth")}
                    </span>
                  )}
                </span>
                <span className="text-xs text-fg-subtle tabular-nums">
                  {free
                    ? t("noCardRequired")
                    : interval === "year" && saving > 0
                      ? t("savesYear", { amount: formatCurrency(saving, plan.currency) })
                      : interval === "year"
                        ? t("billedYearlyCaption")
                        : t("billedMonthly")}
                </span>
              </div>

              <div className="min-w-0">
                {isCurrent ? (
                  <Button size="sm" className="w-full" disabled>
                    {t("currentPlan")}
                  </Button>
                ) : free ? (
                  canManage && hasBillingAccount ? (
                    <ManageBillingButton
                      label={t("downgradeFree")}
                      withIcon={false}
                      className="w-full"
                    />
                  ) : (
                    <Button size="sm" className="w-full" disabled>
                      {t("downgradeFree")}
                    </Button>
                  )
                ) : plan.hasPrice ? (
                  <Button
                    variant={isRecommended ? "primary" : "default"}
                    size="sm"
                    className="w-full"
                    disabled={!canManage || busy || !stripeConfigured || pendingPlan !== null}
                    onClick={() => {
                      void checkout(plan.key);
                    }}
                  >
                    {busy
                      ? t("openingCheckout")
                      : higher
                        ? t("upgradeTo", { name: plan.name })
                        : t("switchTo", { name: plan.name })}
                  </Button>
                ) : (
                  <Button size="sm" className="w-full" href="mailto:sales@short.app">
                    <Icon name="external-link" className="text-sm" aria-hidden="true" />
                    {t("contactSales")}
                  </Button>
                )}
              </div>

              <dl className="m-0 grid min-w-0 grid-cols-1 gap-1.5 border-t border-border pt-4 text-sm">
                {LIMIT_ROWS.map(([key, label]) => {
                  const value = plan.limits[key];
                  const mine = current?.limits[key];
                  const better = mine != null && !isCurrent && rank(value) > rank(mine);
                  const worse = mine != null && !isCurrent && rank(value) < rank(mine);
                  const formatted =
                    key === "retentionDays"
                      ? value === -1
                        ? tc("unlimited")
                        : tc("days", { count: value })
                      : formatLimit(value);

                  return (
                    <div key={key} className="flex min-w-0 items-center justify-between gap-2">
                      <dt className="min-w-0 truncate text-fg-muted">{t(label)}</dt>
                      <dd
                        className={cn(
                          "m-0 flex shrink-0 items-center gap-1 font-mono tabular-nums",
                          better ? "font-medium text-accent-ink" : "text-ink",
                          worse && "text-fg-subtle",
                        )}
                      >
                        {better ? (
                          <Icon name="arrow-up" className="text-xs shrink-0" aria-label={t("moreThanPlan")} />
                        ) : null}
                        {worse ? (
                          <Icon name="arrow-down" className="text-xs shrink-0" aria-label={t("lessThanPlan")} />
                        ) : null}
                        {formatted}
                      </dd>
                    </div>
                  );
                })}
              </dl>

              <ul className="m-0 mt-auto flex list-none flex-col gap-1 border-t border-border p-0 pt-4 text-sm">
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
                        <Icon name="check" className={cn(
                            "size-3.5 shrink-0",
                            gained ? "text-accent-ink" : "text-fg-subtle",
                          )}
                          aria-hidden="true" />
                      ) : (
                        <Icon name="minus" className="text-xs shrink-0" aria-hidden="true" />
                      )}
                      <span className="min-w-0 truncate">{t(label)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="m-0 text-xs leading-relaxed text-fg-subtle">{t("compareHint")}</p>
    </div>
  );
}

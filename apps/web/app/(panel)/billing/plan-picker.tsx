"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Check, ExternalLink, Minus } from "lucide-react";
import type { PlanFeatures, PlanKey } from "@short/core";
import { formatLimit } from "@short/core";
import { Badge, Button, Chip } from "@/components/ui";
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

const LIMIT_ROWS: Array<{
  key: keyof PlanLimitsView;
  label: string;
  format?: (value: number) => string;
}> = [
  { key: "links", label: "Links" },
  { key: "clicksPerMonth", label: "Clicks / mo" },
  { key: "customDomains", label: "Domains" },
  { key: "biopages", label: "Bio pages" },
  { key: "qrCodes", label: "QR codes" },
  { key: "members", label: "Members" },
  {
    key: "retentionDays",
    label: "History",
    format: (value) => (value === -1 ? "Unlimited" : `${value} days`),
  },
];

const FEATURE_ROWS: Array<{ key: keyof PlanFeatures; label: string }> = [
  { key: "targeting", label: "Geo & device targeting" },
  { key: "abTesting", label: "A/B testing" },
  { key: "passwordProtection", label: "Password protection" },
  { key: "cloaking", label: "Link cloaking" },
  { key: "qrLogo", label: "QR logo" },
  { key: "webhooks", label: "Webhooks" },
  { key: "apiAccess", label: "REST API" },
  { key: "removeBranding", label: "No branding" },
];

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
        setError(result.error);
        setPendingPlan(null);
        return;
      }
      // Leaves the button in its pending state — the tab is navigating to Stripe.
      window.location.href = result.data.url;
    } catch {
      setError("Could not start checkout. Try again.");
      setPendingPlan(null);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Billing interval"
        >
          <Chip
            active={interval === "month"}
            aria-pressed={interval === "month"}
            onClick={() => setInterval("month")}
          >
            Monthly
          </Chip>
          <Chip
            active={interval === "year"}
            aria-pressed={interval === "year"}
            onClick={() => setInterval("year")}
          >
            Yearly
            {bestDiscount > 0 ? (
              <span className="font-mono text-xs tabular-nums">−{bestDiscount}%</span>
            ) : null}
          </Chip>
        </div>

        {current ? (
          <p className="m-0 min-w-0 text-sm text-fg-muted">
            You are on <span className="font-medium text-ink">{current.name}</span>, billed{" "}
            {currentInterval === "year" ? "yearly" : "monthly"}.
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="m-0 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {stripeConfigured ? null : (
        <p className="m-0 text-sm text-fg-muted">
          Billing is not configured on this deployment — plans are shown for reference only.
        </p>
      )}

      {canManage ? null : (
        <p className="m-0 text-sm text-fg-muted">
          Only the workspace owner can change the plan. Ask them to review the options below.
        </p>
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
                  <Badge tone="accent">Current</Badge>
                ) : isRecommended ? (
                  <Badge tone="inverse">Recommended</Badge>
                ) : null}
              </div>

              <div className="flex min-w-0 flex-col gap-1">
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
                  <span className="text-3xl leading-tight font-semibold tracking-tight tabular-nums">
                    {free ? "Free" : formatCurrency(price, plan.currency)}
                  </span>
                  {free ? null : (
                    <span className="text-sm text-fg-muted">
                      / {interval === "year" ? "yr" : "mo"}
                    </span>
                  )}
                </span>
                <span className="text-xs text-fg-subtle tabular-nums">
                  {free
                    ? "No card required"
                    : interval === "year" && saving > 0
                      ? `Saves ${formatCurrency(saving, plan.currency)} a year`
                      : `Billed ${interval === "year" ? "yearly" : "monthly"}`}
                </span>
              </div>

              <div className="min-w-0">
                {isCurrent ? (
                  <Button size="sm" className="w-full" disabled>
                    Your plan
                  </Button>
                ) : free ? (
                  canManage && hasBillingAccount ? (
                    <ManageBillingButton
                      label="Downgrade to Free"
                      withIcon={false}
                      className="w-full"
                    />
                  ) : (
                    <Button size="sm" className="w-full" disabled>
                      Downgrade to Free
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
                      ? "Opening checkout…"
                      : higher
                        ? `Upgrade to ${plan.name}`
                        : `Switch to ${plan.name}`}
                  </Button>
                ) : (
                  <Button size="sm" className="w-full" href="mailto:sales@short.app">
                    <ExternalLink className="size-4" aria-hidden="true" />
                    Contact sales
                  </Button>
                )}
              </div>

              <dl className="m-0 grid min-w-0 grid-cols-1 gap-1.5 border-t border-border pt-4 text-sm">
                {LIMIT_ROWS.map((row) => {
                  const value = plan.limits[row.key];
                  const mine = current?.limits[row.key];
                  const better = mine != null && !isCurrent && rank(value) > rank(mine);
                  const worse = mine != null && !isCurrent && rank(value) < rank(mine);

                  return (
                    <div key={row.key} className="flex min-w-0 items-center justify-between gap-2">
                      <dt className="min-w-0 truncate text-fg-muted">{row.label}</dt>
                      <dd
                        className={cn(
                          "m-0 flex shrink-0 items-center gap-1 font-mono tabular-nums",
                          better ? "font-medium text-accent-ink" : "text-ink",
                          worse && "text-fg-subtle",
                        )}
                      >
                        {better ? (
                          <ArrowUp className="size-3 shrink-0" aria-label="more than your plan" />
                        ) : null}
                        {worse ? (
                          <ArrowDown className="size-3 shrink-0" aria-label="less than your plan" />
                        ) : null}
                        {row.format ? row.format(value) : formatLimit(value)}
                      </dd>
                    </div>
                  );
                })}
              </dl>

              <ul className="m-0 mt-auto flex list-none flex-col gap-1 border-t border-border p-0 pt-4 text-sm">
                {FEATURE_ROWS.map((row) => {
                  const on = plan.features[row.key];
                  const gained = on && !isCurrent && current != null && !current.features[row.key];

                  return (
                    <li
                      key={row.key}
                      className={cn(
                        "flex min-w-0 items-center gap-2",
                        !on && "text-fg-disabled",
                        on && gained && "font-medium text-ink",
                        on && !gained && "text-fg-muted",
                      )}
                    >
                      {on ? (
                        <Check
                          className={cn(
                            "size-3.5 shrink-0",
                            gained ? "text-accent-ink" : "text-fg-subtle",
                          )}
                          aria-hidden="true"
                        />
                      ) : (
                        <Minus className="size-3.5 shrink-0" aria-hidden="true" />
                      )}
                      <span className="min-w-0 truncate">{row.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="m-0 text-xs leading-relaxed text-fg-subtle">
        Bold values and arrows compare each plan against your current one. Downgrades keep every
        link, QR code and bio page you already created — anything above the new limit simply stops
        accepting additions.
      </p>
    </div>
  );
}

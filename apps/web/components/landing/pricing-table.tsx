"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { PlanFeatures, PlanKey } from "@short/core";
import { formatLimit } from "@short/core";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cx";

export type PublicPlan = {
  key: PlanKey;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  limits: {
    links: number;
    clicksPerMonth: number;
    customDomains: number;
    biopages: number;
    qrCodes: number;
    members: number;
    teams: number;
    retentionDays: number;
  };
  features: PlanFeatures;
};

const LIMIT_KEYS = [
  ["links", "limitLinks"],
  ["clicksPerMonth", "limitClicks"],
  ["customDomains", "limitDomains"],
  ["biopages", "limitBio"],
  ["qrCodes", "limitQr"],
  ["members", "limitMembers"],
  ["teams", "limitTeams"],
] as const;

const FEATURE_KEYS = [
  ["targeting", "featureTargeting"],
  ["abTesting", "featureAb"],
  ["passwordProtection", "featurePassword"],
  ["cloaking", "featureCloak"],
  ["qrLogo", "featureQrLogo"],
  ["webhooks", "featureWebhooks"],
  ["apiAccess", "featureApi"],
  ["removeBranding", "featureBranding"],
] as const;

export function PricingTable({ plans }: { plans: PublicPlan[] }) {
  const t = useTranslations("billing");
  const tc = useTranslations("common");
  const [interval, setInterval] = useState<"month" | "year">("month");

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <div className="flex justify-center">
        <div className="inline-flex rounded-pill border border-border p-0.5">
          <button
            type="button"
            className={cn(
              "rounded-pill px-3 py-1.5 text-sm",
              interval === "month" ? "bg-inverse text-on-inverse" : "text-fg-muted",
            )}
            onClick={() => setInterval("month")}
          >
            {tc("monthly")}
          </button>
          <button
            type="button"
            className={cn(
              "rounded-pill px-3 py-1.5 text-sm",
              interval === "year" ? "bg-inverse text-on-inverse" : "text-fg-muted",
            )}
            onClick={() => setInterval("year")}
          >
            {tc("yearly")}
          </button>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const yearly = interval === "year" && plan.priceYearly > 0;
          const amount = yearly ? plan.priceYearly : plan.priceMonthly;
          const free = plan.priceMonthly === 0 && plan.priceYearly === 0;
          return (
            <article
              key={plan.key}
              className="flex min-w-0 flex-col gap-5 rounded-default border border-border bg-bg p-5"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <h2 className="m-0 text-lg font-semibold">{plan.name}</h2>
                <p className="m-0 text-2xl font-semibold tracking-tight">
                  {free ? tc("free") : formatCurrency(amount, plan.currency)}
                  {free ? null : (
                    <span className="ms-1 text-sm font-normal text-fg-muted">
                      {yearly ? t("perYear") : t("perMonth")}
                    </span>
                  )}
                </p>
              </div>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
                {LIMIT_KEYS.map(([key, label]) => (
                  <li key={key} className="flex justify-between gap-3">
                    <span className="text-fg-muted">{t(label)}</span>
                    <span>
                      {plan.limits[key] === -1 ? tc("unlimited") : formatLimit(plan.limits[key])}
                    </span>
                  </li>
                ))}
                <li className="flex justify-between gap-3">
                  <span className="text-fg-muted">{t("limitHistory")}</span>
                  <span>
                    {plan.limits.retentionDays === -1
                      ? tc("unlimited")
                      : tc("days", { count: plan.limits.retentionDays })}
                  </span>
                </li>
              </ul>
              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-fg-muted">
                {FEATURE_KEYS.map(([key, label]) =>
                  plan.features[key] ? <li key={key}>{t(label)}</li> : null,
                )}
              </ul>
              <Link className="kit-btn kit-btn--primary mt-auto" href="/register">
                {free ? t("ctaFree") : t("ctaPaid")}
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}

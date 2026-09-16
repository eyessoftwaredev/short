import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PublicChrome } from "@/components/landing/public-chrome";
import { PricingTable, type PublicPlan } from "@/components/landing/pricing-table";
import { listPlans } from "@/lib/billing";
import { panelUrl } from "@/lib/public-url";

export const metadata: Metadata = { title: "Pricing" };

export default async function PricingPage() {
  const [t, rows] = await Promise.all([getTranslations("billing"), listPlans()]);

  const plans: PublicPlan[] = rows.map((row) => ({
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
    },
    features: row.features,
  }));

  return (
    <PublicChrome>
      <section className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6 px-6 py-16">
        <header className="flex min-w-0 flex-col items-center gap-3 text-center">
          <p className="m-0 font-mono text-xs tracking-widest text-accent-ink uppercase">
            {t("pricingEyebrow")}
          </p>
          <h1 className="m-0 text-4xl font-semibold tracking-tight">{t("pricingTitle")}</h1>
          <p className="m-0 max-w-prose text-base text-fg-muted">{t("pricingBody")}</p>
        </header>
        <PricingTable plans={plans} registerHref={panelUrl("/register")} />
      </section>
    </PublicChrome>
  );
}

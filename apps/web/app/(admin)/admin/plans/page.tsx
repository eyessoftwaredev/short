import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Hero } from "@/components/ui";
import { getPlanDistribution } from "@/lib/admin";
import { listPlans } from "@/lib/billing";
import { requireSuperadmin } from "@/lib/session";
import { PlansEditor, type PlanEditorRow } from "./plans-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.plans");
  return { title: t("metaTitle") };
}

export default async function AdminPlansPage() {
  await requireSuperadmin();
  const t = await getTranslations("admin.plans");
  const tNav = await getTranslations("admin.nav");
  const tn = await getTranslations("nav");

  const [planRows, distribution] = await Promise.all([listPlans(true), getPlanDistribution()]);
  const subscribers = new Map(distribution.map((row) => [row.planKey, row.workspaces]));

  const rows: PlanEditorRow[] = planRows.map((row) => ({
    key: row.key,
    name: row.name,
    priceMonthly: row.priceMonthly,
    priceYearly: row.priceYearly,
    currency: row.currency as "USD" | "TRY" | "EUR",
    limits: { ...row.definition.limits, ...row.limits },
    features: { ...row.definition.features, ...row.features },
    stripePriceMonthlyId: row.stripePriceMonthlyId,
    stripePriceYearlyId: row.stripePriceYearlyId,
    visible: row.visible,
    subscribers: subscribers.get(row.key) ?? 0,
  }));

  return (
    <PanelShell title={tn("admin-plans")} crumbs={[{ label: tNav("admin") }, { label: tn("admin-plans") }]}>
      <Hero
        eyebrow={t("count", { count: rows.length })}
        title={t("title")}
        description={t("description")}
      />

      <PlansEditor rows={rows} />
    </PanelShell>
  );
}

import type { Metadata } from "next";
import { PanelShell } from "@/components/shell/panel-shell";
import { Hero } from "@/components/ui";
import { getPlanDistribution } from "@/lib/admin";
import { listPlans } from "@/lib/billing";
import { requireSuperadmin } from "@/lib/session";
import { PlansEditor, type PlanEditorRow } from "./plans-editor";

export const metadata: Metadata = { title: "Plans · Admin" };

export default async function AdminPlansPage() {
  await requireSuperadmin();

  const [planRows, distribution] = await Promise.all([listPlans(true), getPlanDistribution()]);
  const subscribers = new Map(distribution.map((row) => [row.planKey, row.workspaces]));

  const rows: PlanEditorRow[] = planRows.map((row) => ({
    key: row.key,
    name: row.name,
    priceMonthly: row.priceMonthly,
    priceYearly: row.priceYearly,
    currency: row.currency as "USD" | "TRY" | "EUR",
    limits: row.limits,
    features: row.features,
    stripePriceMonthlyId: row.stripePriceMonthlyId,
    stripePriceYearlyId: row.stripePriceYearlyId,
    visible: row.visible,
    subscribers: subscribers.get(row.key) ?? 0,
  }));

  return (
    <PanelShell title="Plans" crumbs={[{ label: "Admin" }, { label: "Plans" }]}>
      <Hero
        eyebrow={`${rows.length} plans`}
        title="Plan catalogue"
        description="Limits and features are read from Postgres on every request, so a change here takes effect without a deploy. Prices are in minor units and must match the Stripe price you attach."
      />

      <PlansEditor rows={rows} />
    </PanelShell>
  );
}

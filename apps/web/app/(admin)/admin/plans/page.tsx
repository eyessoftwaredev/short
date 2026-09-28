import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Badge, Callout, PageHeader } from "@/components/ui";
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
  const [t, tNav] = await Promise.all([getTranslations("admin.plans"), getTranslations("admin.nav")]);

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

  const missingStripe = rows.filter(
    (row) =>
      row.visible &&
      row.key !== "free" &&
      row.priceMonthly > 0 &&
      !row.stripePriceMonthlyId &&
      !row.stripePriceYearlyId,
  );

  return (
    <PanelShell title={t("title")} crumbs={[{ label: tNav("admin"), href: "/admin" }]}>
      <PageHeader
        title={t("title")}
        meta={<Badge tone="neutral">{t("count", { count: rows.length })}</Badge>}
        description={t("description")}
      />

      {missingStripe.length > 0 ? (
        <Callout tone="warn" title={t("missingStripeTitle", { count: missingStripe.length })}>
          {t("missingStripeBody", { plans: missingStripe.map((row) => row.name).join(", ") })}
        </Callout>
      ) : null}

      <PlansEditor rows={rows} />
    </PanelShell>
  );
}

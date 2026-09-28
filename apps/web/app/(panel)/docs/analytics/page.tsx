import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPageShell } from "@/components/docs/docs-page-shell";
import { DocsCallout, DocsHero, DocsProse, DocsSection, DocsTable } from "@/components/docs/docs-ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.analytics");
  return { title: t("metaTitle") };
}

const METRIC_ROWS = ["clicks", "visitors", "scans", "bio", "referrer", "country", "device", "utm"] as const;

export default async function AnalyticsGuidePage() {
  const t = await getTranslations("docs.analytics");

  return (
    <DocsPageShell section="analytics">
      <DocsHero icon="chart-line" title={t("title")} description={t("description")} />

      <DocsSection id="dashboard" title={t("dashboardTitle")}>
        <DocsProse>
          <p>{t("dashboardBody")}</p>
        </DocsProse>
      </DocsSection>

      <DocsSection id="per-link" title={t("linkTitle")}>
        <DocsProse>
          <p>{t("linkBody")}</p>
        </DocsProse>
      </DocsSection>

      <DocsSection id="metrics" title={t("metricsTitle")}>
        <DocsTable
          headers={[t("table.metric"), t("table.meaning")]}
          rows={METRIC_ROWS.map((row) => [t(`table.rows.${row}`), t(`table.rows.${row}Desc`)])}
        />
      </DocsSection>

      <DocsCallout title={t("botsTitle")}>
        <p>{t("botsBody")}</p>
      </DocsCallout>

      <DocsSection id="ranges" title={t("rangesTitle")}>
        <DocsProse>
          <p>{t("rangesBody")}</p>
        </DocsProse>
      </DocsSection>

      <DocsSection id="export" title={t("exportTitle")}>
        <DocsProse>
          <p>{t("exportBody")}</p>
        </DocsProse>
      </DocsSection>
    </DocsPageShell>
  );
}

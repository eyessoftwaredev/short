import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPageShell } from "@/components/docs/docs-page-shell";
import { DocsHero, DocsProse, DocsTable } from "@/components/docs/docs-ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.analytics");
  return { title: t("metaTitle") };
}

export default async function AnalyticsGuidePage() {
  const t = await getTranslations("docs.analytics");

  return (
    <DocsPageShell section="analytics">
      <div className="flex flex-col gap-10">
        <DocsHero title={t("title")} description={t("description")} />

        <DocsProse>
          <h2>{t("dashboardTitle")}</h2>
          <p>{t("dashboardBody")}</p>
        </DocsProse>

        <DocsProse>
          <h2>{t("linkTitle")}</h2>
          <p>{t("linkBody")}</p>
        </DocsProse>

        <DocsTable
          headers={[t("table.metric"), t("table.meaning")]}
          rows={[
            [t("table.rows.clicks"), t("table.rows.clicksDesc")],
            [t("table.rows.visitors"), t("table.rows.visitorsDesc")],
            [t("table.rows.referrer"), t("table.rows.referrerDesc")],
            [t("table.rows.country"), t("table.rows.countryDesc")],
            [t("table.rows.device"), t("table.rows.deviceDesc")],
          ]}
        />

        <DocsProse>
          <h2>{t("rangesTitle")}</h2>
          <p>{t("rangesBody")}</p>
        </DocsProse>

        <DocsProse>
          <h2>{t("exportTitle")}</h2>
          <p>{t("exportBody")}</p>
        </DocsProse>
      </div>
    </DocsPageShell>
  );
}

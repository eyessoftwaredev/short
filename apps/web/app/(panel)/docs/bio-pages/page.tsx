import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPageShell } from "@/components/docs/docs-page-shell";
import { DocsCallout, DocsHero, DocsProse } from "@/components/docs/docs-ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.bioPages");
  return { title: t("metaTitle") };
}

export default async function BioPagesGuidePage() {
  const t = await getTranslations("docs.bioPages");

  return (
    <DocsPageShell section="bio-pages">
      <div className="flex flex-col gap-10">
        <DocsHero title={t("title")} description={t("description")} />

        <DocsProse>
          <h2>{t("handleTitle")}</h2>
          <p>{t("handleBody")}</p>
        </DocsProse>

        <DocsProse>
          <h2>{t("blocksTitle")}</h2>
          <p>{t("blocksBody")}</p>
          <ul>
            <li>{t("blocks.0")}</li>
            <li>{t("blocks.1")}</li>
            <li>{t("blocks.2")}</li>
            <li>{t("blocks.3")}</li>
            <li>{t("blocks.4")}</li>
          </ul>
        </DocsProse>

        <DocsProse>
          <h2>{t("publishTitle")}</h2>
          <p>{t("publishBody")}</p>
        </DocsProse>

        <DocsCallout title={t("leadsTitle")} variant="tip">
          <p>{t("leadsBody")}</p>
        </DocsCallout>

        <DocsProse>
          <h2>{t("statsTitle")}</h2>
          <p>{t("statsBody")}</p>
        </DocsProse>
      </div>
    </DocsPageShell>
  );
}

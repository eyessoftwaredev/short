import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPageShell } from "@/components/docs/docs-page-shell";
import { DocsCallout, DocsHero, DocsProse, DocsTable } from "@/components/docs/docs-ui";
import Link from "next/link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.links");
  return { title: t("metaTitle") };
}

export default async function LinksGuidePage() {
  const t = await getTranslations("docs.links");

  return (
    <DocsPageShell section="links">
      <div className="flex flex-col gap-10">
        <DocsHero title={t("title")} description={t("description")} />

        <DocsProse>
          <h2>{t("createTitle")}</h2>
          <p>{t("createBody")}</p>
          <ol>
            <li>{t("createSteps.0")}</li>
            <li>{t("createSteps.1")}</li>
            <li>{t("createSteps.2")}</li>
            <li>{t("createSteps.3")}</li>
          </ol>
        </DocsProse>

        <DocsProse>
          <h2>{t("optionsTitle")}</h2>
          <p>{t("optionsBody")}</p>
        </DocsProse>

        <DocsTable
          headers={[t("table.option"), t("table.description")]}
          rows={[
            [t("table.rows.slug.label"), t("table.rows.slug.desc")],
            [t("table.rows.password.label"), t("table.rows.password.desc")],
            [t("table.rows.expiry.label"), t("table.rows.expiry.desc")],
            [t("table.rows.utm.label"), t("table.rows.utm.desc")],
            [t("table.rows.tags.label"), t("table.rows.tags.desc")],
            [t("table.rows.cloak.label"), t("table.rows.cloak.desc")],
          ]}
        />

        <DocsCallout title={t("organizeTitle")}>
          <p>{t("organizeBody")}</p>
        </DocsCallout>

        <DocsProse>
          <h2>{t("relatedTitle")}</h2>
          <ul>
            <li>
              <Link href="/docs/routing" className="text-accent hover:underline">
                {t("relatedRouting")}
              </Link>
            </li>
            <li>
              <Link href="/docs/analytics" className="text-accent hover:underline">
                {t("relatedAnalytics")}
              </Link>
            </li>
          </ul>
        </DocsProse>
      </div>
    </DocsPageShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DocsPageShell } from "@/components/docs/docs-page-shell";
import { DocsCallout, DocsHero, DocsProse, DocsSection, DocsTable } from "@/components/docs/docs-ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.links");
  return { title: t("metaTitle") };
}

const OPTION_ROWS = [
  "slug",
  "password",
  "expiry",
  "schedule",
  "utm",
  "forward",
  "devices",
  "openMode",
  "tags",
  "cloak",
] as const;

export default async function LinksGuidePage() {
  const t = await getTranslations("docs.links");

  return (
    <DocsPageShell section="links">
      <DocsHero icon="link" title={t("title")} description={t("description")} />

      <DocsSection id="create" title={t("createTitle")}>
        <DocsProse>
          <p>{t("createBody")}</p>
          <ol>
            <li>{t("createSteps.0")}</li>
            <li>{t("createSteps.1")}</li>
            <li>{t("createSteps.2")}</li>
            <li>{t("createSteps.3")}</li>
          </ol>
        </DocsProse>
      </DocsSection>

      <DocsSection id="options" title={t("optionsTitle")}>
        <DocsProse>
          <p>{t("optionsBody")}</p>
        </DocsProse>
        <DocsTable
          headers={[t("table.option"), t("table.description")]}
          rows={OPTION_ROWS.map((row) => [t(`table.rows.${row}.label`), t(`table.rows.${row}.desc`)])}
        />
      </DocsSection>

      <DocsSection id="organize" title={t("organizeTitle")}>
        <DocsProse>
          <p>{t("organizeBody")}</p>
        </DocsProse>
      </DocsSection>

      <DocsSection id="bulk" title={t("bulkTitle")}>
        <DocsProse>
          <p>{t("bulkBody")}</p>
          <ul>
            <li>{t("bulkItems.0")}</li>
            <li>{t("bulkItems.1")}</li>
            <li>{t("bulkItems.2")}</li>
          </ul>
        </DocsProse>
      </DocsSection>

      <DocsCallout title={t("relatedTitle")}>
        <p>
          <Link href="/docs/routing">{t("relatedRouting")}</Link>
        </p>
        <p>
          <Link href="/docs/analytics">{t("relatedAnalytics")}</Link>
        </p>
      </DocsCallout>
    </DocsPageShell>
  );
}

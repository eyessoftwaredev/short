import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPageShell } from "@/components/docs/docs-page-shell";
import { DocsCallout, DocsHero, DocsProse, DocsSection } from "@/components/docs/docs-ui";
import { serverEnv } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.bioPages");
  return { title: t("metaTitle") };
}

export default async function BioPagesGuidePage() {
  const t = await getTranslations("docs.bioPages");
  const host = serverEnv().PLATFORM_SHORT_DOMAIN;

  return (
    <DocsPageShell section="bio-pages">
      <DocsHero icon="address-card" title={t("title")} description={t("description")} />

      <DocsSection id="handle" title={t("handleTitle")}>
        <DocsProse>
          <p>{t.rich("handleBody", { host, code: (chunks) => <code>{chunks}</code> })}</p>
        </DocsProse>
      </DocsSection>

      <DocsSection id="blocks" title={t("blocksTitle")}>
        <DocsProse>
          <p>{t("blocksBody")}</p>
          <ul>
            {(["0", "1", "2", "3", "4", "5"] as const).map((key) => (
              <li key={key}>{t(`blocks.${key}`)}</li>
            ))}
          </ul>
        </DocsProse>
      </DocsSection>

      <DocsSection id="look" title={t("lookTitle")}>
        <DocsProse>
          <p>{t("lookBody")}</p>
        </DocsProse>
      </DocsSection>

      <DocsSection id="publish" title={t("publishTitle")}>
        <DocsProse>
          <p>{t("publishBody")}</p>
        </DocsProse>
      </DocsSection>

      <DocsCallout title={t("leadsTitle")} variant="tip">
        <p>{t("leadsBody")}</p>
      </DocsCallout>

      <DocsSection id="stats" title={t("statsTitle")}>
        <DocsProse>
          <p>{t("statsBody")}</p>
        </DocsProse>
      </DocsSection>
    </DocsPageShell>
  );
}

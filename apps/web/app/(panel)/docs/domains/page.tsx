import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPageShell } from "@/components/docs/docs-page-shell";
import { DocsCallout, DocsHero, DocsProse, DocsStep } from "@/components/docs/docs-ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.domains");
  return { title: t("metaTitle") };
}

export default async function DomainsGuidePage() {
  const t = await getTranslations("docs.domains");

  return (
    <DocsPageShell section="domains">
      <div className="flex flex-col gap-10">
        <DocsHero title={t("title")} description={t("description")} />

        <div className="flex flex-col gap-8">
          <DocsStep index={1} title={t("steps.add.title")}>
            <p>{t("steps.add.body")}</p>
          </DocsStep>
          <DocsStep index={2} title={t("steps.dns.title")}>
            <p>{t("steps.dns.body")}</p>
          </DocsStep>
          <DocsStep index={3} title={t("steps.verify.title")}>
            <p>{t("steps.verify.body")}</p>
          </DocsStep>
          <DocsStep index={4} title={t("steps.default.title")}>
            <p>{t("steps.default.body")}</p>
          </DocsStep>
        </div>

        <DocsProse>
          <h2>{t("rootTitle")}</h2>
          <p>{t("rootBody")}</p>
        </DocsProse>

        <DocsCallout title={t("sslTitle")}>
          <p>{t("sslBody")}</p>
        </DocsCallout>
      </div>
    </DocsPageShell>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPageShell } from "@/components/docs/docs-page-shell";
import { DocsCodeBlock, DocsHero, DocsProse, DocsTable } from "@/components/docs/docs-ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.routing");
  return { title: t("metaTitle") };
}

export default async function RoutingGuidePage() {
  const t = await getTranslations("docs.routing");

  const example = `{
  "destination": "https://acme.com/pricing",
  "rules": [
    { "type": "country", "match": "TR", "destination": "https://acme.com/tr/fiyat" },
    { "type": "device", "match": "ios", "destination": "https://apps.apple.com/app/acme" },
    { "type": "language", "match": "de", "destination": "https://acme.com/de/preise" }
  ]
}`;

  return (
    <DocsPageShell section="routing">
      <div className="flex flex-col gap-10">
        <DocsHero title={t("title")} description={t("description")} />

        <DocsProse>
          <h2>{t("howTitle")}</h2>
          <p>{t("howBody")}</p>
        </DocsProse>

        <DocsTable
          headers={[t("table.rule"), t("table.example")]}
          rows={[
            [t("table.rows.country"), t("table.rows.countryEx")],
            [t("table.rows.device"), t("table.rows.deviceEx")],
            [t("table.rows.language"), t("table.rows.languageEx")],
            [t("table.rows.ab"), t("table.rows.abEx")],
          ]}
        />

        <DocsProse>
          <h2>{t("priorityTitle")}</h2>
          <p>{t("priorityBody")}</p>
        </DocsProse>

        <DocsProse>
          <h2>{t("exampleTitle")}</h2>
          <p>{t("exampleBody")}</p>
        </DocsProse>

        <DocsCodeBlock code={example} language="json" />

        <DocsProse>
          <h2>{t("mobileTitle")}</h2>
          <p>{t("mobileBody")}</p>
        </DocsProse>
      </div>
    </DocsPageShell>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPageShell } from "@/components/docs/docs-page-shell";
import { DocsHero, DocsProse, DocsTable } from "@/components/docs/docs-ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.qrCodes");
  return { title: t("metaTitle") };
}

export default async function QrCodesGuidePage() {
  const t = await getTranslations("docs.qrCodes");

  return (
    <DocsPageShell section="qr-codes">
      <div className="flex flex-col gap-10">
        <DocsHero title={t("title")} description={t("description")} />

        <DocsProse>
          <h2>{t("createTitle")}</h2>
          <p>{t("createBody")}</p>
          <ol>
            <li>{t("createSteps.0")}</li>
            <li>{t("createSteps.1")}</li>
            <li>{t("createSteps.2")}</li>
          </ol>
        </DocsProse>

        <DocsProse>
          <h2>{t("payloadTitle")}</h2>
          <p>{t("payloadBody")}</p>
        </DocsProse>

        <DocsTable
          headers={[t("table.kind"), t("table.use")]}
          rows={[
            [t("table.rows.link"), t("table.rows.linkDesc")],
            [t("table.rows.url"), t("table.rows.urlDesc")],
            [t("table.rows.vcard"), t("table.rows.vcardDesc")],
            [t("table.rows.wifi"), t("table.rows.wifiDesc")],
          ]}
        />

        <DocsProse>
          <h2>{t("designTitle")}</h2>
          <p>{t("designBody")}</p>
          <ul>
            <li>{t("designTips.0")}</li>
            <li>{t("designTips.1")}</li>
            <li>{t("designTips.2")}</li>
          </ul>
        </DocsProse>
      </div>
    </DocsPageShell>
  );
}

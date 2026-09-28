import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPageShell } from "@/components/docs/docs-page-shell";
import { DocsCallout, DocsHero, DocsProse, DocsSection, DocsTable } from "@/components/docs/docs-ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.qrCodes");
  return { title: t("metaTitle") };
}

export default async function QrCodesGuidePage() {
  const t = await getTranslations("docs.qrCodes");

  return (
    <DocsPageShell section="qr-codes">
      <DocsHero icon="qrcode" title={t("title")} description={t("description")} />

      <DocsSection id="create" title={t("createTitle")}>
        <DocsProse>
          <p>{t("createBody")}</p>
          <ol>
            <li>{t("createSteps.0")}</li>
            <li>{t("createSteps.1")}</li>
            <li>{t("createSteps.2")}</li>
          </ol>
        </DocsProse>
      </DocsSection>

      <DocsSection id="types" title={t("payloadTitle")}>
        <DocsProse>
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
        <DocsCallout title={t("dynamicTitle")} variant="tip">
          <p>{t("dynamicBody")}</p>
        </DocsCallout>
      </DocsSection>

      <DocsSection id="design" title={t("designTitle")}>
        <DocsProse>
          <p>{t("designBody")}</p>
          <ul>
            <li>{t("designTips.0")}</li>
            <li>{t("designTips.1")}</li>
            <li>{t("designTips.2")}</li>
          </ul>
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

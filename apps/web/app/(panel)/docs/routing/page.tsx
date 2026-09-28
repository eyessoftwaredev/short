import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPageShell } from "@/components/docs/docs-page-shell";
import { DocsCallout, DocsCodeBlock, DocsHero, DocsProse, DocsSection, DocsTable } from "@/components/docs/docs-ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.routing");
  return { title: t("metaTitle") };
}

const RULE_ROWS = ["geo", "device", "os", "browser", "language", "referrer", "schedule", "ab"] as const;

/** Mirrors `targetRuleSchema` / `abVariantSchema` in packages/core/src/targeting/schema.ts. */
const EXAMPLE = `{
  "domainId": "YOUR_DOMAIN_UUID",
  "destination": "https://acme.com/pricing",
  "iosDestination": "https://apps.apple.com/app/acme/id000000000",
  "rules": [
    {
      "id": "turkey",
      "priority": 0,
      "conditions": [
        { "type": "country", "op": "in", "values": ["TR"] }
      ],
      "destination": "https://acme.com/tr/fiyatlar"
    },
    {
      "id": "german-desktop",
      "priority": 1,
      "conditions": [
        { "type": "language", "op": "in", "values": ["de"] },
        { "type": "device", "op": "in", "values": ["desktop"] }
      ],
      "destination": "https://acme.com/de/preise"
    }
  ],
  "abVariants": [
    { "id": "a", "destination": "https://acme.com/pricing", "weight": 50 },
    { "id": "b", "destination": "https://acme.com/pricing-v2", "weight": 50 }
  ],
  "openMode": "auto"
}`;

export default async function RoutingGuidePage() {
  const t = await getTranslations("docs.routing");

  return (
    <DocsPageShell section="routing">
      <DocsHero icon="share-nodes" title={t("title")} description={t("description")} />

      <DocsSection id="how" title={t("howTitle")}>
        <DocsProse>
          <p>{t("howBody")}</p>
          <ol>
            {(["0", "1", "2", "3", "4"] as const).map((key) => (
              <li key={key}>{t(`order.${key}`)}</li>
            ))}
          </ol>
        </DocsProse>
      </DocsSection>

      <DocsSection id="conditions" title={t("conditionsTitle")}>
        <DocsProse>
          <p>{t("conditionsBody")}</p>
        </DocsProse>
        <DocsTable
          headers={[t("table.rule"), t("table.example")]}
          rows={RULE_ROWS.map((row) => [t(`table.rows.${row}`), t(`table.rows.${row}Ex`)])}
        />
      </DocsSection>

      <DocsSection id="priority" title={t("priorityTitle")}>
        <DocsProse>
          <p>{t("priorityBody")}</p>
        </DocsProse>
      </DocsSection>

      <DocsSection id="open-in-app" title={t("appsTitle")}>
        <DocsProse>
          <p>{t("appsBody")}</p>
        </DocsProse>
        <DocsTable
          headers={[t("appsTable.mode"), t("appsTable.what")]}
          monoFirst
          rows={[
            ["auto", t("appsTable.auto")],
            ["app", t("appsTable.app")],
            ["browser", t("appsTable.browser")],
          ]}
        />
        <DocsCallout title={t("appsListTitle")}>
          <p>{t("appsList")}</p>
        </DocsCallout>
      </DocsSection>

      <DocsSection id="stores" title={t("mobileTitle")}>
        <DocsProse>
          <p>{t("mobileBody")}</p>
        </DocsProse>
      </DocsSection>

      <DocsSection id="api" title={t("exampleTitle")}>
        <DocsProse>
          <p>{t("exampleBody")}</p>
        </DocsProse>
        <DocsCodeBlock code={EXAMPLE} language="json" title="POST /api/v1/links" />
      </DocsSection>
    </DocsPageShell>
  );
}

import { WEBHOOK_EVENTS } from "@short/core";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DocsPageShell } from "@/components/docs/docs-page-shell";
import { DocsCallout, DocsCodeBlock, DocsHero, DocsProse, DocsSection, DocsTable } from "@/components/docs/docs-ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.webhooks");
  return { title: t("metaTitle") };
}

/** Shape sent by lib/webhooks.ts: `{ event, createdAt, data }`. */
const PAYLOAD_EXAMPLE = `POST /your/endpoint HTTP/1.1
content-type: application/json
user-agent: Short-Webhooks/1
x-short-event: link.clicked
x-short-signature: t=1767225600,v1=5f2b…c9

{
  "event": "link.clicked",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "data": {
    "linkId": "0f8c…",
    "hostname": "go.acme.com",
    "slug": "launch",
    "qrId": null,
    "ts": "2026-01-01T00:00:00.000Z",
    "destination": "https://acme.com/launch",
    "country": "TR",
    "city": "Istanbul",
    "device": "mobile",
    "os": "ios",
    "browser": "safari",
    "referrer": "instagram.com"
  }
}`;

const VERIFY_EXAMPLE = `const crypto = require("crypto");

// header: the x-short-signature value, "t=<unix seconds>,v1=<hex>"
function verify(rawBody, header, secret, toleranceSeconds = 300) {
  const parts = Object.fromEntries(
    header.split(",").map((part) => part.split("=", 2))
  );
  const timestamp = Number(parts.t);
  if (!parts.v1 || !Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(\`\${parts.t}.\${rawBody}\`, "utf8")
    .digest("hex");
  const a = Buffer.from(parts.v1, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}`;

export default async function WebhooksGuidePage() {
  const t = await getTranslations("docs.webhooks");

  return (
    <DocsPageShell section="webhooks">
      <DocsHero icon="repeat" title={t("title")} description={t("description")} />

      <DocsSection id="setup" title={t("setupTitle")}>
        <DocsProse>
          <p>{t("setupBody")}</p>
        </DocsProse>
        <DocsCallout title={t("settingsTitle")}>
          <p>
            {t("settingsBody")} <Link href="/settings?tab=webhooks">{t("settingsLink")}</Link>
          </p>
        </DocsCallout>
      </DocsSection>

      <DocsSection id="events" title={t("eventsTitle")}>
        <DocsProse>
          <p>{t("eventsBody")}</p>
        </DocsProse>
        <DocsTable
          headers={[t("eventsTable.event"), t("eventsTable.when")]}
          monoFirst
          // Event names contain dots, which next-intl reads as nesting, so the keys use "_".
          rows={WEBHOOK_EVENTS.map((event) => [event, t(`eventsTable.rows.${event.replace(".", "_")}`)])}
        />
      </DocsSection>

      <DocsSection id="payload" title={t("payloadTitle")}>
        <DocsProse>
          <p>{t("payloadBody")}</p>
        </DocsProse>
        <DocsCodeBlock code={PAYLOAD_EXAMPLE} language="http" />
      </DocsSection>

      <DocsSection id="signature" title={t("signatureTitle")}>
        <DocsProse>
          <p>{t("signatureBody")}</p>
        </DocsProse>
        <DocsCodeBlock code={VERIFY_EXAMPLE} language="javascript" title="verify.js" />
      </DocsSection>

      <DocsSection id="delivery" title={t("deliveryTitle")}>
        <DocsProse>
          <p>{t("deliveryBody")}</p>
          <ul>
            <li>{t("deliveryTips.0")}</li>
            <li>{t("deliveryTips.1")}</li>
            <li>{t("deliveryTips.2")}</li>
            <li>{t("deliveryTips.3")}</li>
          </ul>
        </DocsProse>
      </DocsSection>
    </DocsPageShell>
  );
}

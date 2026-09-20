import { WEBHOOK_EVENTS } from "@short/core";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPageShell } from "@/components/docs/docs-page-shell";
import { DocsCallout, DocsCodeBlock, DocsHero, DocsProse, DocsTable } from "@/components/docs/docs-ui";
import Link from "next/link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.webhooks");
  return { title: t("metaTitle") };
}

export default async function WebhooksGuidePage() {
  const t = await getTranslations("docs.webhooks");

  const verifyExample = `const crypto = require("crypto");

function verify(rawBody, signature, secret) {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}`;

  return (
    <DocsPageShell section="webhooks">
      <div className="flex flex-col gap-10">
        <DocsHero title={t("title")} description={t("description")} />

        <DocsProse>
          <h2>{t("setupTitle")}</h2>
          <p>{t("setupBody")}</p>
        </DocsProse>

        <DocsCallout title={t("settingsTitle")}>
          <p>
            {t("settingsBody")}{" "}
            <Link href="/settings" className="text-accent hover:underline">
              {t("settingsLink")}
            </Link>
          </p>
        </DocsCallout>

        <DocsProse>
          <h2>{t("eventsTitle")}</h2>
          <p>{t("eventsBody")}</p>
        </DocsProse>

        <DocsTable
          headers={[t("eventsTable.event"), t("eventsTable.when")]}
          rows={WEBHOOK_EVENTS.map((event) => [event, t(`eventsTable.rows.${event}`)])}
        />

        <DocsProse>
          <h2>{t("signatureTitle")}</h2>
          <p>{t("signatureBody")}</p>
        </DocsProse>

        <DocsCodeBlock code={verifyExample} language="javascript" />

        <DocsProse>
          <h2>{t("deliveryTitle")}</h2>
          <p>{t("deliveryBody")}</p>
          <ul>
            <li>{t("deliveryTips.0")}</li>
            <li>{t("deliveryTips.1")}</li>
            <li>{t("deliveryTips.2")}</li>
          </ul>
        </DocsProse>
      </div>
    </DocsPageShell>
  );
}

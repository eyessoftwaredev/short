import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPageShell } from "@/components/docs/docs-page-shell";
import {
  DocsCallout,
  DocsCodeBlock,
  DocsHero,
  DocsProse,
  DocsSection,
  DocsStep,
  DocsSteps,
} from "@/components/docs/docs-ui";
import { cnameTarget } from "@/lib/domains";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.domains");
  return { title: t("metaTitle") };
}

export default async function DomainsGuidePage() {
  const t = await getTranslations("docs.domains");
  const target = cnameTarget();
  const steps = ["add", "dns", "verify", "default"] as const;

  return (
    <DocsPageShell section="domains">
      <DocsHero icon="globe" title={t("title")} description={t("description")} />

      <DocsSection id="setup" title={t("setupTitle")}>
        <DocsSteps>
          {steps.map((step, index) => (
            <DocsStep key={step} index={index + 1} title={t(`steps.${step}.title`)}>
              <p>{t(`steps.${step}.body`)}</p>
            </DocsStep>
          ))}
        </DocsSteps>
      </DocsSection>

      <DocsSection id="dns" title={t("dnsTitle")}>
        <DocsProse>
          <p>{t("dnsBody")}</p>
        </DocsProse>
        <DocsCodeBlock language="dns" code={`go.acme.com.   CNAME   ${target}.`} />
      </DocsSection>

      <DocsSection id="root" title={t("rootTitle")}>
        <DocsProse>
          <p>{t("rootBody")}</p>
        </DocsProse>
      </DocsSection>

      <DocsCallout title={t("sslTitle")} variant="warn">
        <p>{t("sslBody")}</p>
      </DocsCallout>
    </DocsPageShell>
  );
}

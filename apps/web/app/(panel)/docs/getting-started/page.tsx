import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPageShell } from "@/components/docs/docs-page-shell";
import { DocsCallout, DocsCard, DocsHero, DocsSection, DocsStep, DocsSteps } from "@/components/docs/docs-ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.gettingStarted");
  return { title: t("metaTitle") };
}

export default async function GettingStartedPage() {
  const [t, tn] = await Promise.all([getTranslations("docs.gettingStarted"), getTranslations("docs")]);
  const steps = ["account", "domain", "link", "share"] as const;

  return (
    <DocsPageShell section="getting-started">
      <DocsHero icon="bolt" title={t("title")} description={t("description")} />

      <DocsSection id="steps" title={t("stepsTitle")}>
        <DocsSteps>
          {steps.map((step, index) => (
            <DocsStep key={step} index={index + 1} title={t(`steps.${step}.title`)}>
              <p>{t(`steps.${step}.body`)}</p>
            </DocsStep>
          ))}
        </DocsSteps>
      </DocsSection>

      <DocsCallout title={t("tip.title")} variant="tip">
        <p>{t("tip.body")}</p>
      </DocsCallout>

      <DocsSection id="next" title={t("nextTitle")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <DocsCard href="/docs/links" icon="link" title={tn("nav.links")} description={t("nextLinks")} />
          <DocsCard href="/docs/routing" icon="share-nodes" title={tn("nav.routing")} description={t("nextRouting")} />
          <DocsCard href="/docs/api" icon="code" title={tn("nav.api")} description={t("nextApi")} />
        </div>
      </DocsSection>
    </DocsPageShell>
  );
}

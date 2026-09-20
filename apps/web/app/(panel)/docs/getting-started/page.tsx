import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPageShell } from "@/components/docs/docs-page-shell";
import { DocsCallout, DocsHero, DocsProse, DocsStep } from "@/components/docs/docs-ui";
import Link from "next/link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.gettingStarted");
  return { title: t("metaTitle") };
}

export default async function GettingStartedPage() {
  const t = await getTranslations("docs.gettingStarted");

  return (
    <DocsPageShell section="getting-started">
      <div className="flex flex-col gap-10">
        <DocsHero title={t("title")} description={t("description")} />

        <div className="flex flex-col gap-8">
          <DocsStep index={1} title={t("steps.account.title")}>
            <p>{t("steps.account.body")}</p>
          </DocsStep>
          <DocsStep index={2} title={t("steps.domain.title")}>
            <p>{t("steps.domain.body")}</p>
          </DocsStep>
          <DocsStep index={3} title={t("steps.link.title")}>
            <p>{t("steps.link.body")}</p>
          </DocsStep>
          <DocsStep index={4} title={t("steps.share.title")}>
            <p>{t("steps.share.body")}</p>
          </DocsStep>
        </div>

        <DocsCallout title={t("tip.title")} variant="tip">
          <p>{t("tip.body")}</p>
        </DocsCallout>

        <DocsProse>
          <h2>{t("nextTitle")}</h2>
          <ul>
            <li>
              <Link href="/docs/links" className="text-accent hover:underline">
                {t("nextLinks")}
              </Link>
            </li>
            <li>
              <Link href="/docs/analytics" className="text-accent hover:underline">
                {t("nextAnalytics")}
              </Link>
            </li>
            <li>
              <Link href="/docs/api" className="text-accent hover:underline">
                {t("nextApi")}
              </Link>
            </li>
          </ul>
        </DocsProse>
      </div>
    </DocsPageShell>
  );
}

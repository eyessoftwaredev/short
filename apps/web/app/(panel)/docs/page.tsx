import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPageShell } from "@/components/docs/docs-page-shell";
import { DocsCard, DocsHero, DocsProse } from "@/components/docs/docs-ui";
import { docsNavGroups } from "@/lib/docs-nav";
import Link from "next/link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.overview");
  return { title: t("metaTitle") };
}

export default async function DocsOverviewPage() {
  const t = await getTranslations("docs");
  const overview = await getTranslations("docs.overview");
  const guideItems = docsNavGroups
    .flatMap((group) => group.items)
    .filter((item) => item.id !== "overview");

  return (
    <DocsPageShell section="overview">
      <div className="flex flex-col gap-10">
        <DocsHero eyebrow={overview("eyebrow")} title={overview("title")} description={overview("description")} />

        <DocsProse>
          <p>{overview("intro")}</p>
        </DocsProse>

        <div className="grid gap-4 sm:grid-cols-2">
          {guideItems.map((item) => (
            <DocsCard
              key={item.id}
              href={item.href}
              icon={item.icon}
              title={t(item.labelKey)}
              description={overview(`cards.${item.id}`)}
            />
          ))}
        </div>

        <section className="flex flex-col gap-3 rounded-default border border-border bg-surface-subtle p-5">
          <h2 className="m-0 text-base font-semibold text-ink">{overview("quickLinksTitle")}</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
            <li>
              <Link href="/links/new" className="text-accent hover:underline">
                {overview("quickLinkCreate")}
              </Link>
            </li>
            <li>
              <Link href="/settings" className="text-accent hover:underline">
                {overview("quickLinkSettings")}
              </Link>
            </li>
            <li>
              <Link href="/docs/api" className="text-accent hover:underline">
                {overview("quickLinkApi")}
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </DocsPageShell>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DocsPageShell } from "@/components/docs/docs-page-shell";
import { DocsCard, DocsHero } from "@/components/docs/docs-ui";
import { Button, Callout } from "@/components/ui";
import { contactEmails } from "@/lib/contact";
import { docsNavGroups } from "@/lib/docs-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.overview");
  return { title: t("metaTitle") };
}

export default async function DocsOverviewPage() {
  const t = await getTranslations("docs");
  const overview = await getTranslations("docs.overview");
  const mail = contactEmails();
  const groups = docsNavGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.id !== "overview") }))
    .filter((group) => group.items.length > 0);

  return (
    <DocsPageShell section="overview">
      <DocsHero eyebrow={overview("eyebrow")} title={overview("title")} description={overview("description")} />

      <div className="flex min-w-0 flex-col gap-4 rounded-lg border border-accent-border bg-accent-tint p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="m-0 text-[15px] font-semibold text-ink">{overview("quickLinksTitle")}</h2>
          <p className="m-0 text-sm leading-relaxed text-fg-muted">{overview("intro")}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button href="/docs/api" size="sm" leadingIcon="code">
            {overview("quickLinkApi")}
          </Button>
          <Button href="/links/new" size="sm" variant="primary" leadingIcon="plus">
            {overview("quickLinkCreate")}
          </Button>
        </div>
      </div>

      {groups.map((group) => (
        <section key={group.labelKey} className="flex min-w-0 flex-col gap-4">
          <h2 className="m-0 text-lg font-semibold tracking-tight text-ink">{t(group.labelKey)}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.items.map((item) => (
              <DocsCard
                key={item.id}
                href={item.href}
                icon={item.icon}
                title={t(item.labelKey)}
                description={overview(`cards.${item.id}`)}
              />
            ))}
          </div>
        </section>
      ))}

      <Callout tone="neutral" title={overview("helpTitle")}>
        {overview.rich("helpBody", {
          support: () => <a href={`mailto:${mail.support}`}>{mail.support}</a>,
          security: () => <a href={`mailto:${mail.security}`}>{mail.security}</a>,
        })}
      </Callout>
    </DocsPageShell>
  );
}

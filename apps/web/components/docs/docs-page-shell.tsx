"use client";

import { DocsMobileNav } from "@/components/docs/docs-mobile-nav";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { DocsToc } from "@/components/docs/docs-toc";
import { DocsPager } from "@/components/docs/docs-ui";
import { PanelShell } from "@/components/shell/panel-shell";
import { docsNavGroups, type DocsSectionId } from "@/lib/docs-nav";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

type DocsPageShellProps = {
  section: DocsSectionId;
  children: ReactNode;
};

const ARTICLE_ID = "docs-article";

/**
 * Three columns on wide screens: guide list, the article (~70ch), and the
 * "On this page" index. Below `xl` the index hides; below `lg` the guide list
 * becomes a scrollable chip row above the article.
 */
export function DocsPageShell({ section, children }: DocsPageShellProps) {
  const t = useTranslations("docs");
  const items = docsNavGroups.flatMap((group) => group.items);
  const index = items.findIndex((entry) => entry.id === section);
  const current = items[index];
  const pageLabel = t(current?.labelKey ?? "nav.overview");
  const prev = index > 0 ? items[index - 1] : null;
  const next = index >= 0 && index < items.length - 1 ? items[index + 1] : null;

  return (
    <PanelShell
      title={t("shellTitle")}
      crumbs={section === "overview" ? [{ label: t("shellTitle") }] : [{ label: t("shellTitle"), href: "/docs" }, { label: pageLabel }]}
      searchable={false}
      contentClassName="pb-24 lg:pb-10"
    >
      <div className="flex w-full min-w-0 gap-10">
        <DocsSidebar active={section} />
        <div className="flex min-w-0 flex-1 gap-10">
          <article id={ARTICLE_ID} className="flex max-w-3xl min-w-0 flex-1 flex-col gap-10">
            <DocsMobileNav active={section} />
            {children}
            <DocsPager
              prev={prev ? { href: prev.href, label: t(prev.labelKey) } : null}
              next={next ? { href: next.href, label: t(next.labelKey) } : null}
              prevLabel={t("previous")}
              nextLabel={t("next")}
            />
          </article>
          <aside className="hidden w-52 shrink-0 xl:block">
            <div className="sticky top-24">
              <DocsToc label={t("onThisPage")} rootId={ARTICLE_ID} />
            </div>
          </aside>
        </div>
      </div>
    </PanelShell>
  );
}

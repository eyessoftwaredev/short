"use client";

import { DocsMobileNav } from "@/components/docs/docs-mobile-nav";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { PanelShell } from "@/components/shell/panel-shell";
import { docsNavGroups, type DocsSectionId } from "@/lib/docs-nav";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

type DocsPageShellProps = {
  section: DocsSectionId;
  children: ReactNode;
};

function sectionLabelKey(section: DocsSectionId): string {
  const item = docsNavGroups.flatMap((group) => group.items).find((entry) => entry.id === section);
  return item?.labelKey ?? "nav.overview";
}

export function DocsPageShell({ section, children }: DocsPageShellProps) {
  const t = useTranslations("docs");
  const pageLabel = t(sectionLabelKey(section));

  return (
    <PanelShell
      title={t("shellTitle")}
      crumbs={[{ label: t("shellTitle"), href: "/docs" }, { label: pageLabel }]}
      searchable={false}
      contentClassName="pb-24 lg:pb-8"
    >
      <div className="mx-auto flex w-full max-w-6xl gap-10">
        <DocsSidebar active={section} />
        <div className="min-w-0 flex-1">
          <DocsMobileNav active={section} />
          {children}
        </div>
      </div>
    </PanelShell>
  );
}

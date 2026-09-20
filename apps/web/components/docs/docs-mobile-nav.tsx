"use client";

import { docsNavGroups, type DocsSectionId } from "@/lib/docs-nav";
import { cn } from "@/lib/cx";
import Link from "next/link";
import { useTranslations } from "next-intl";

type DocsMobileNavProps = {
  active: DocsSectionId;
};

export function DocsMobileNav({ active }: DocsMobileNavProps) {
  const t = useTranslations("docs");
  const items = docsNavGroups.flatMap((group) => group.items);

  return (
    <nav
      aria-label={t("sidebarLabel")}
      className="mb-6 flex gap-2 overflow-x-auto pb-1 lg:hidden"
    >
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-default border px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-border bg-surface text-fg-muted hover:text-ink",
            )}
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

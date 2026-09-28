"use client";

import { docsNavGroups, type DocsSectionId } from "@/lib/docs-nav";
import { cn } from "@/lib/cx";
import Link from "next/link";
import { useTranslations } from "next-intl";

type DocsMobileNavProps = {
  active: DocsSectionId;
};

/** Guide switcher below `lg`: one scrollable row of chips, the current one first in view. */
export function DocsMobileNav({ active }: DocsMobileNavProps) {
  const t = useTranslations("docs");
  const items = docsNavGroups.flatMap((group) => group.items);

  return (
    <nav
      aria-label={t("sidebarLabel")}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:hidden"
    >
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-pill border px-3 py-1.5 text-[13px] font-medium no-underline transition-colors hover:no-underline",
              isActive
                ? "border-accent-border bg-accent-surface text-accent-on-surface hover:text-accent-on-surface"
                : "border-border bg-bg text-fg-muted hover:border-border-hover hover:text-ink",
            )}
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

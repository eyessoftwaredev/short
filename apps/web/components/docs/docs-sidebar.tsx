"use client";

import { Icon } from "@/components/kit/icon";
import { docsNavGroups, type DocsSectionId } from "@/lib/docs-nav";
import { cn } from "@/lib/cx";
import Link from "next/link";
import { useTranslations } from "next-intl";

type DocsSidebarProps = {
  active: DocsSectionId;
};

export function DocsSidebar({ active }: DocsSidebarProps) {
  const t = useTranslations("docs");

  return (
    <nav aria-label={t("sidebarLabel")} className="hidden w-52 shrink-0 lg:block">
      <div className="sticky top-24 flex flex-col gap-6">
        {docsNavGroups.map((group) => (
          <div key={group.labelKey} className="flex flex-col gap-0.5">
            <p className="m-0 mb-1 px-2.5 text-[13px] font-medium text-fg-subtle">{t(group.labelKey)}</p>
            {group.items.map((item) => {
              const isActive = item.id === active;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-w-0 items-center gap-2.5 rounded-default px-2.5 py-1.5 text-sm no-underline transition-colors hover:no-underline",
                    isActive
                      ? "bg-accent-surface font-medium text-accent-on-surface hover:text-accent-on-surface"
                      : "text-fg-muted hover:bg-surface-strong hover:text-ink",
                  )}
                >
                  <Icon
                    name={item.icon}
                    className={cn("shrink-0 text-xs", isActive ? "text-accent-on-surface" : "text-fg-subtle")}
                  />
                  <span className="truncate">{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}

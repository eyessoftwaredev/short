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
    <nav
      aria-label={t("sidebarLabel")}
      className="hidden w-56 shrink-0 lg:block"
    >
      <div className="sticky top-24 flex flex-col gap-6">
        {docsNavGroups.map((group) => (
          <div key={group.labelKey} className="flex flex-col gap-1">
            <p className="m-0 px-2 font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
              {t(group.labelKey)}
            </p>
            {group.items.map((item) => {
              const isActive = item.id === active;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-w-0 items-center gap-2.5 rounded-default px-2.5 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-accent/10 font-medium text-accent"
                      : "text-fg-muted hover:bg-surface-subtle hover:text-ink",
                  )}
                >
                  <Icon name={item.icon} className="shrink-0 text-xs" aria-hidden="true" />
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

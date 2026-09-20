"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/kit/icon";
import { usePanelSession } from "@/components/providers/session-provider";
import { cn } from "@/lib/cx";
import { getNavForRole } from "@/lib/nav";

const MOBILE_TAB_IDS = ["dashboard", "links", "qr", "bio", "settings"] as const;

export function MobileTabBar() {
  const pathname = usePathname();
  const session = usePanelSession();
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const items = getNavForRole(session.role)
    .flatMap((group) => group.items)
    .filter((item) => (MOBILE_TAB_IDS as readonly string[]).includes(item.id));
  const tabs = MOBILE_TAB_IDS.map((id) => items.find((item) => item.id === id)).filter(
    (item): item is NonNullable<typeof item> => item != null,
  );

  if (tabs.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label={tc("mobileTabs")}
      className="fixed inset-x-0 bottom-0 z-sticky flex border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {tabs.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-[10px] font-medium no-underline transition duration-200",
              active ? "text-accent-ink" : "text-fg-muted hover:text-ink hover:no-underline",
            )}
          >
            <Icon name={item.icon} className="text-base" />
            <span className="max-w-full truncate">{t(item.id as "dashboard")}</span>
          </Link>
        );
      })}
    </nav>
  );
}

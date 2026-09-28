"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/kit/icon";
import { usePanelSession } from "@/components/providers/session-provider";
import { cn } from "@/lib/cx";
import { getNavForRole } from "@/lib/nav";
import { CreateMenu } from "./sidebar";

/** Left and right of the centre Create button. */
const LEFT_TABS = ["dashboard", "links"] as const;
const RIGHT_TABS = ["analytics"] as const;

type MobileTabBarProps = {
  /** Opens the full navigation drawer ("More"). */
  onOpenMenu?: () => void;
};

function TabLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: IconName;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[11px] leading-none font-medium no-underline transition-colors duration-150 hover:no-underline",
        active ? "text-accent-ink" : "text-fg-muted hover:text-ink",
      )}
    >
      <Icon name={icon} className="text-[17px]" />
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

/**
 * Bottom navigation below `lg`: Home · Links · (+ Create) · Analytics · More.
 * Everything else lives in the drawer behind "More".
 */
export function MobileTabBar({ onOpenMenu }: MobileTabBarProps) {
  const pathname = usePathname();
  const session = usePanelSession();
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const ts = useTranslations("shell");
  const items = getNavForRole(session.role).flatMap((group) => group.items);
  const find = (id: string) => items.find((item) => item.id === id);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const render = (ids: readonly string[]) =>
    ids.map((id) => {
      const item = find(id);
      if (!item) {
        return null;
      }
      return (
        <TabLink
          key={item.id}
          href={item.href}
          label={id === "dashboard" ? ts("home") : t(item.id as "dashboard")}
          icon={id === "dashboard" ? "house" : item.icon}
          active={isActive(item.href)}
        />
      );
    });

  return (
    <nav
      aria-label={tc("mobileTabs")}
      className="fixed inset-x-0 bottom-0 z-sticky flex items-stretch border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      {render(LEFT_TABS)}
      <div className="flex flex-1 items-center justify-center">
        <CreateMenu
          align="end"
          trigger={
            <button
              type="button"
              aria-label={ts("create")}
              className="-mt-3 flex size-12 items-center justify-center rounded-full bg-accent text-on-accent shadow-lift ring-4 ring-bg transition-colors duration-150 hover:bg-accent-hover"
            >
              <Icon name="plus" className="text-lg" />
            </button>
          }
        />
      </div>
      {render(RIGHT_TABS)}
      {onOpenMenu ? (
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[11px] leading-none font-medium text-fg-muted transition-colors duration-150 hover:text-ink"
        >
          <Icon name="bars" className="text-[17px]" />
          <span className="max-w-full truncate">{ts("more")}</span>
        </button>
      ) : null}
    </nav>
  );
}

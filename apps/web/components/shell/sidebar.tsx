"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { Icon } from "@/components/kit/icon";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dropdown, type DropdownItem } from "@/components/ui/dropdown";
import { useTranslations } from "next-intl";
import { initials, usePanelSession } from "@/components/providers/session-provider";
import { cn } from "@/lib/cx";
import { getNavForRole, type NavGroup } from "@/lib/nav";

type SidebarProps = {
  brand: ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
  onSwitchWorkspace: (workspaceId: string) => void;
  onCreateTeam: () => void;
  onSignOut: () => void;
};

/**
 * Longest matching href wins. A plain `startsWith` lights up both `/admin` and
 * `/admin/users` on the users page, which makes the nav look broken.
 */
function activeHref(pathname: string, groups: NavGroup[]): string | null {
  let best: string | null = null;
  for (const group of groups) {
    for (const item of group.items) {
      const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (matches && (best == null || item.href.length > best.length)) {
        best = item.href;
      }
    }
  }
  return best;
}

function SidebarNavItem({
  href,
  label,
  icon,
  count,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: NavGroup["items"][number]["icon"];
  count?: string;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-w-0 items-center gap-2.5 rounded-default py-2 text-sm no-underline transition duration-200 hover:bg-surface hover:text-ink hover:no-underline",
        collapsed ? "justify-center px-0" : "px-2.5",
        // A rail plus the tint: the active row still reads as active in a
        // high-contrast or forced-colours view where the tint is dropped.
        active
          ? "bg-accent-surface font-medium text-accent-on-surface before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-pill before:bg-accent"
          : "text-fg-muted",
      )}
    >
      <Icon name={icon} className="shrink-0 text-sm" />
      <span className={cn("min-w-0 truncate", collapsed && "sr-only")}>{label}</span>
      {count && !collapsed ? (
        <span className="numeric ml-auto font-mono text-xs text-fg-subtle">{count}</span>
      ) : null}
    </Link>
  );
}

export function Sidebar({
  brand,
  collapsed = false,
  onToggle,
  onSwitchWorkspace,
  onCreateTeam,
  onSignOut,
}: SidebarProps) {
  const pathname = usePathname();
  const session = usePanelSession();
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const groups = getNavForRole(session.role);
  const current = useMemo(() => activeHref(pathname, groups), [pathname, groups]);

  const personal = session.workspaces.filter((workspace) => workspace.kind === "personal");
  const teams = session.workspaces.filter((workspace) => workspace.kind === "team");

  const workspaceItems: DropdownItem[] = [
    { id: "hdr-personal", label: tc("personal"), disabled: true },
    ...personal.map((workspace) => ({
      id: workspace.id,
      label: workspace.name,
      icon:
        workspace.id === session.workspace.id ? (
          <Icon name="check" className="text-sm text-accent" />
        ) : undefined,
      onSelect: () => onSwitchWorkspace(workspace.id),
    })),
    { id: "hdr-teams", label: tc("teams"), disabled: true, separated: true },
    ...teams.map((workspace) => ({
      id: workspace.id,
      label: workspace.name,
      icon:
        workspace.id === session.workspace.id ? (
          <Icon name="check" className="text-sm text-accent" />
        ) : undefined,
      onSelect: () => onSwitchWorkspace(workspace.id),
    })),
    {
      id: "create-team",
      label: session.canCreateTeam ? tc("createTeam") : tc("createTeamUpgrade"),
      icon: <Icon name="plus" className="text-sm" />,
      onSelect: onCreateTeam,
      disabled: !session.canCreateTeam,
      separated: true,
    },
    {
      id: "workspace-settings",
      label: tc("workspaceSettings"),
      href: "/settings?tab=workspace",
      icon: <Icon name="user-gear" className="text-sm" />,
    },
  ];

  return (
    // Pinned to the viewport: the nav and the account footer stay put no matter
    // how long the page it sits beside is.
    <aside
      className={cn(
        "sticky top-0 flex h-svh shrink-0 flex-col border-r border-border bg-surface-subtle transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex min-h-14 min-w-0 items-center gap-2.5 border-b border-border px-3.5",
          collapsed && "justify-center px-0",
        )}
      >
        <div className={cn("min-w-0 flex-1", collapsed && "sr-only")}>{brand}</div>
        {onToggle ? (
          <Button
            variant="ghost"
            icon
            aria-label={collapsed ? tc("expandSidebar") : tc("collapseSidebar")}
            aria-expanded={!collapsed}
            onClick={onToggle}
          >
            {collapsed ? <Icon name="chevron-right" className="text-sm" /> : <Icon name="chevron-left" className="text-sm" />}
          </Button>
        ) : null}
      </div>

      {/*
        Collapsed keeps the switcher rather than hiding it: which workspace you
        are in is the one thing that must never become invisible in a
        multi-tenant panel.
      */}
      <div className={cn("border-b border-border p-2", collapsed && "px-2")}>
        <Dropdown
          align="start"
          label={tc("switchWorkspace")}
          className="w-full"
          items={workspaceItems}
          trigger={
            <button
              type="button"
              title={collapsed ? session.workspace.name : undefined}
              aria-label={tc("workspaceAria", { name: session.workspace.name })}
              className={cn(
                "flex w-full min-w-0 items-center rounded-default text-left transition duration-200",
                collapsed
                  ? "justify-center px-0 py-1.5 hover:bg-surface"
                  : "gap-2.5 border border-border-strong bg-bg px-2 py-1.5 hover:bg-surface",
              )}
            >
              <Avatar className="hover:translate-y-0">
                {initials(session.workspace.name, session.workspace.slug)}
              </Avatar>
              {collapsed ? null : (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {session.workspace.name}
                    </span>
                    <Badge tone="muted" className="mt-0.5 px-1.5 py-0">
                      {session.workspace.kind === "personal" ? tc("personal") : tc("team")}
                      {" · "}
                      {session.planName}
                    </Badge>
                  </span>
                  <Icon name="chevron-down" className="shrink-0 text-xs text-fg-subtle" />
                </>
              )}
            </button>
          }
        />
      </div>

      <nav aria-label={tc("mainNav")} className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 py-3">
        {groups.map((group, groupIndex) => (
          <div key={group.label} className="flex flex-col gap-1">
            {collapsed ? (
              // The label is unreadable at 64px, but the grouping still is —
              // a rule keeps the rhythm the words used to carry.
              groupIndex > 0 ? (
                <span className="mx-2 mb-1 h-px bg-border" aria-hidden="true" />
              ) : null
            ) : (
              <div className="px-2 font-mono text-xs tracking-widest text-fg-subtle uppercase">
                {t(group.label.toLowerCase() as "overview")}
              </div>
            )}
            <ul
              className="m-0 flex list-none flex-col gap-0.5 p-0"
              aria-label={collapsed ? t(group.label.toLowerCase() as "overview") : undefined}
            >
              {group.items.map((item) => (
                <li key={item.id} className="min-w-0">
                  <SidebarNavItem
                    href={item.href}
                    label={t(item.id as "dashboard")}
                    icon={item.icon}
                    count={item.count}
                    collapsed={collapsed}
                    active={current === item.href}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn("border-t border-border p-3", collapsed && "px-2")}>
        {session.impersonatedBy && !collapsed ? (
          <Badge tone="warn" dot className="mb-3 w-full justify-center">
            {tc("impersonating")}
          </Badge>
        ) : null}
        <div
          className={cn(
            "flex min-w-0 items-center gap-2.5",
            collapsed && "flex-col justify-center gap-2",
          )}
        >
          <Avatar title={collapsed ? session.user.email : undefined}>
            {initials(session.user.name, session.user.email)}
          </Avatar>
          <div className={cn("min-w-0 flex-1", collapsed && "sr-only")}>
            <div className="truncate text-sm font-medium">
              {session.user.name || session.user.email}
            </div>
            <div className="truncate text-xs text-fg-subtle">{session.user.email}</div>
          </div>
          {/* Previously dropped entirely when collapsed, stranding the user. */}
          <Button variant="ghost" icon aria-label={tc("signOut")} onClick={onSignOut}>
            <Icon name="right-from-bracket" className="text-sm" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

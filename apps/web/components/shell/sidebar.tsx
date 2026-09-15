"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, ChevronsUpDown, LogOut, UserCog } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dropdown, type DropdownItem } from "@/components/ui/dropdown";
import { initials, usePanelSession } from "@/components/providers/session-provider";
import { cn } from "@/lib/cx";
import { getNavForRole, type NavGroup } from "@/lib/nav";

type SidebarProps = {
  brand: ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
  onSwitchWorkspace: (workspaceId: string) => void;
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
  icon: Icon,
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
      <Icon className="size-4 shrink-0" aria-hidden="true" />
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
  onSignOut,
}: SidebarProps) {
  const pathname = usePathname();
  const session = usePanelSession();
  const groups = getNavForRole(session.role);
  const current = useMemo(() => activeHref(pathname, groups), [pathname, groups]);

  const workspaceItems: DropdownItem[] = [
    ...session.workspaces.map((workspace) => ({
      id: workspace.id,
      label: workspace.name,
      icon:
        workspace.id === session.workspace.id ? (
          <Check className="size-4 text-accent" />
        ) : undefined,
      onSelect: () => onSwitchWorkspace(workspace.id),
    })),
    {
      id: "workspace-settings",
      label: "Workspace settings",
      href: "/settings?tab=workspace",
      icon: <UserCog className="size-4" />,
      separated: true,
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
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            onClick={onToggle}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </Button>
        ) : null}
      </div>

      {/*
        Collapsed keeps the switcher rather than hiding it: which workspace you
        are in is the one thing that must never become invisible in a
        multi-tenant panel.
      */}
      <div className={cn("border-b border-border py-2", collapsed ? "px-2" : "px-2")}>
        <Dropdown
          align="start"
          label="Switch workspace"
          className={collapsed ? "w-full justify-center" : "w-full"}
          items={workspaceItems}
          trigger={
            <button
              type="button"
              title={collapsed ? session.workspace.name : undefined}
              aria-label={`Workspace: ${session.workspace.name}. Switch workspace`}
              className={cn(
                "flex w-full min-w-0 items-center gap-2 rounded-default text-left transition duration-200 hover:bg-surface",
                collapsed ? "justify-center px-0 py-1.5" : "px-2 py-2",
              )}
            >
              {collapsed ? (
                <Avatar className="hover:translate-y-0">
                  {initials(session.workspace.name, session.workspace.slug)}
                </Avatar>
              ) : (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {session.workspace.name}
                    </span>
                    <span className="block truncate text-xs text-fg-subtle">
                      {session.planName}
                    </span>
                  </span>
                  <ChevronsUpDown className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                </>
              )}
            </button>
          }
        />
      </div>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 py-3">
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
                {group.label}
              </div>
            )}
            <ul
              className="m-0 flex list-none flex-col gap-0.5 p-0"
              aria-label={collapsed ? group.label : undefined}
            >
              {group.items.map((item) => (
                <li key={item.id} className="min-w-0">
                  <SidebarNavItem
                    href={item.href}
                    label={item.label}
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
            Impersonating
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
          <Button variant="ghost" icon aria-label="Sign out" onClick={onSignOut}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/kit/icon";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dropdown, type DropdownItem } from "@/components/ui/dropdown";
import { QuotaMeter } from "@/components/ui/quota-meter";
import { initials, usePanelSession } from "@/components/providers/session-provider";
import { cn } from "@/lib/cx";
import { createActions, getNavForRole, type NavGroup } from "@/lib/nav";

type SidebarShellProps = {
  /** Full lockup (logo + wordmark) for the expanded rail and the drawer. */
  brand: ReactNode;
  /** Logo-only mark for the collapsed rail. Falls back to `brand`. */
  brandCompact?: ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
  onSwitchWorkspace: (workspaceId: string) => void;
  onCreateTeam: () => void;
  onSignOut: () => void;
  /** Called after a nav link is chosen — closes the mobile drawer. */
  onNavigate?: () => void;
  showCollapseToggle?: boolean;
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
  onNavigate,
}: {
  href: string;
  label: string;
  icon: NavGroup["items"][number]["icon"];
  count?: string;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "group flex h-9 min-w-0 items-center gap-2.5 rounded-default text-sm font-medium no-underline transition-colors duration-150 hover:no-underline",
        collapsed ? "mx-auto w-9 justify-center px-0" : "px-2.5",
        active
          ? "bg-bg text-ink shadow-xs ring-1 ring-border"
          : "text-fg-muted hover:bg-surface-strong hover:text-ink",
      )}
    >
      <Icon
        name={icon}
        className={cn(
          "text-[15px]",
          active ? "text-accent" : "text-fg-subtle group-hover:text-fg-muted",
        )}
      />
      <span className={cn("min-w-0 truncate", collapsed && "sr-only")}>{label}</span>
      {count && !collapsed ? (
        <span className="numeric ml-auto text-xs text-fg-subtle">{count}</span>
      ) : null}
    </Link>
  );
}

function WorkspaceSwitcher({
  collapsed,
  onSwitchWorkspace,
  onCreateTeam,
}: {
  collapsed: boolean;
  onSwitchWorkspace: (workspaceId: string) => void;
  onCreateTeam: () => void;
}) {
  const session = usePanelSession();
  const tc = useTranslations("common");
  const ts = useTranslations("shell");

  const personal = session.workspaces.filter((workspace) => workspace.kind === "personal");
  const teams = session.workspaces.filter((workspace) => workspace.kind === "team");
  const toItem = (workspace: (typeof session.workspaces)[number]): DropdownItem => ({
    id: workspace.id,
    label: workspace.name,
    icon: (
      <Avatar size="sm" shape="square" tone="neutral" className="size-5 text-[9px]">
        {initials(workspace.name, workspace.slug)}
      </Avatar>
    ),
    selected: workspace.id === session.workspace.id,
    onSelect: () => onSwitchWorkspace(workspace.id),
  });

  const items: DropdownItem[] = [
    { id: "hdr-personal", label: tc("personal"), heading: true },
    ...personal.map(toItem),
    ...(teams.length > 0
      ? [{ id: "hdr-teams", label: tc("teams"), heading: true, separated: true }, ...teams.map(toItem)]
      : []),
    {
      id: "create-team",
      label: session.canCreateTeam ? tc("createTeam") : tc("createTeamUpgrade"),
      icon: <Icon name="plus" className="text-xs" />,
      onSelect: onCreateTeam,
      disabled: !session.canCreateTeam,
      separated: true,
    },
    {
      id: "workspace-settings",
      label: tc("workspaceSettings"),
      href: "/settings?tab=team",
      icon: <Icon name="gear" className="text-xs" />,
    },
  ];

  const kindLabel = session.workspace.kind === "personal" ? tc("personal") : tc("team");

  return (
    <Dropdown
      align="start"
      label={tc("switchWorkspace")}
      className="w-full"
      items={items}
      trigger={
        <button
          type="button"
          title={collapsed ? session.workspace.name : undefined}
          aria-label={tc("workspaceAria", { name: session.workspace.name })}
          className={cn(
            "flex w-full min-w-0 items-center rounded-md text-left transition-colors duration-150",
            collapsed
              ? "justify-center p-1 hover:bg-surface-strong"
              : "gap-2.5 border border-border bg-bg px-2 py-1.5 shadow-xs hover:border-border-strong",
          )}
        >
          <Avatar shape="square" size="md">
            {initials(session.workspace.name, session.workspace.slug)}
          </Avatar>
          {collapsed ? null : (
            <>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm leading-5 font-semibold text-ink">
                  {session.workspace.name}
                </span>
                <span className="truncate text-xs leading-4 text-fg-subtle">
                  {kindLabel} · {ts("planName", { plan: session.planName })}
                </span>
              </span>
              <Icon name="up-down" className="text-[11px] text-fg-subtle" />
            </>
          )}
        </button>
      }
    />
  );
}

/** "+ Create" with a menu of the three things a user can make. */
export function CreateMenu({
  collapsed = false,
  align = "start",
  trigger,
}: {
  collapsed?: boolean;
  align?: "start" | "end";
  /** Custom trigger (the mobile tab bar uses a round button). */
  trigger?: ReactNode;
}) {
  const ts = useTranslations("shell");
  const items: DropdownItem[] = createActions.map((action) => ({
    id: action.id,
    label: ts(action.label),
    description: ts(action.description),
    href: action.href,
    icon: <Icon name={action.icon} className="text-sm" />,
  }));

  return (
    <Dropdown
      align={align}
      label={ts("createMenu")}
      className={trigger ? undefined : "w-full"}
      items={items}
      trigger={
        trigger ??
        (collapsed ? (
          <Button variant="primary" icon aria-label={ts("create")} title={ts("create")} className="mx-auto">
            <Icon name="plus" className="text-sm" />
          </Button>
        ) : (
          <Button variant="primary" block leadingIcon="plus" trailingIcon="chevron-down" className="justify-between">
            <span className="flex-1 text-left">{ts("create")}</span>
          </Button>
        ))
      }
    />
  );
}

function PlanCard() {
  const session = usePanelSession();
  const ts = useTranslations("shell");
  const tc = useTranslations("common");
  const canManageBilling = session.role === "owner" || session.role === "superadmin";
  const limited = session.usage != null && session.usage.linkLimit !== -1;

  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-md border border-border bg-bg p-3 shadow-xs">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="truncate text-[13px] font-semibold text-ink">
          {ts("planName", { plan: session.planName })}
        </span>
        {session.impersonatedBy ? (
          <Badge tone="warn" size="sm" dot>
            {tc("impersonating")}
          </Badge>
        ) : null}
      </div>
      {session.usage ? (
        <QuotaMeter compact label={ts("linksUsage")} used={session.usage.links} limit={session.usage.linkLimit} />
      ) : null}
      {canManageBilling ? (
        <Button
          size="sm"
          variant={limited ? "secondary" : "ghost"}
          block
          href="/billing"
          leadingIcon={limited ? "rocket" : "credit-card"}
        >
          {limited ? ts("upgrade") : ts("managePlan")}
        </Button>
      ) : null}
    </div>
  );
}

function SidebarPanel({
  brand,
  brandCompact,
  collapsed = false,
  onToggle,
  onSwitchWorkspace,
  onCreateTeam,
  onSignOut,
  onNavigate,
  showCollapseToggle = true,
}: SidebarShellProps) {
  const pathname = usePathname();
  const session = usePanelSession();
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const groups = getNavForRole(session.role);
  const current = useMemo(() => activeHref(pathname, groups), [pathname, groups]);
  const inDrawer = onNavigate != null && !showCollapseToggle;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-2",
          collapsed ? "justify-center px-2" : "justify-between pr-2 pl-4",
        )}
      >
        <div className="flex min-w-0 items-center">{collapsed ? (brandCompact ?? brand) : brand}</div>
        {showCollapseToggle && onToggle && !collapsed ? (
          <Button
            variant="ghost"
            icon
            size="sm"
            aria-label={tc("collapseSidebar")}
            title={tc("collapseSidebar")}
            aria-expanded
            onClick={onToggle}
          >
            <Icon name="angles-left" className="text-xs" />
          </Button>
        ) : inDrawer ? (
          <Button variant="ghost" icon size="sm" aria-label={tc("close")} onClick={onNavigate}>
            <Icon name="xmark" className="text-sm" />
          </Button>
        ) : null}
      </div>

      <div className={cn("flex shrink-0 flex-col gap-2 pb-3", collapsed ? "items-center px-2" : "px-3")}>
        <WorkspaceSwitcher
          collapsed={collapsed}
          onSwitchWorkspace={onSwitchWorkspace}
          onCreateTeam={onCreateTeam}
        />
        <CreateMenu collapsed={collapsed} />
      </div>

      <nav
        aria-label={tc("mainNav")}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto py-2",
          collapsed ? "px-2" : "px-3",
        )}
      >
        {groups.map((group, groupIndex) => {
          const groupLabel = t(group.label.toLowerCase() as "manage");
          return (
            <div key={group.label} className="flex flex-col gap-1">
              {collapsed ? (
                groupIndex > 0 ? (
                  <span className="mx-2 mb-1 h-px bg-border" aria-hidden="true" />
                ) : null
              ) : (
                <div className="px-2.5 pb-0.5 text-xs font-medium text-fg-subtle">{groupLabel}</div>
              )}
              <ul className="m-0 flex list-none flex-col gap-0.5 p-0" aria-label={groupLabel}>
                {group.items.map((item) => (
                  <li key={item.id} className="min-w-0">
                    <SidebarNavItem
                      href={item.href}
                      label={t(item.id as "dashboard")}
                      icon={item.icon}
                      count={item.count}
                      collapsed={collapsed}
                      active={current === item.href}
                      onNavigate={onNavigate}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className={cn("flex shrink-0 flex-col gap-2 border-t border-border p-3", collapsed && "items-center px-2")}>
        {collapsed ? (
          <Button
            variant="ghost"
            icon
            size="sm"
            aria-label={tc("expandSidebar")}
            title={tc("expandSidebar")}
            aria-expanded={false}
            onClick={onToggle}
          >
            <Icon name="angles-right" className="text-xs" />
          </Button>
        ) : (
          <PlanCard />
        )}
        {inDrawer ? (
          <div className="flex min-w-0 items-center gap-2.5 px-1 pt-1">
            <Avatar size="sm">{initials(session.user.name, session.user.email)}</Avatar>
            <span className="min-w-0 flex-1 truncate text-[13px] text-fg-muted">{session.user.email}</span>
            <Button variant="ghost" icon size="sm" aria-label={tc("signOut")} title={tc("signOut")} onClick={onSignOut}>
              <Icon name="right-from-bracket" className="text-xs" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Sidebar(props: SidebarShellProps) {
  const { collapsed = false, ...rest } = props;

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-svh shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 lg:flex",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <SidebarPanel collapsed={collapsed} showCollapseToggle {...rest} />
    </aside>
  );
}

type MobileNavDrawerProps = SidebarShellProps & {
  open: boolean;
  onClose: () => void;
};

export function MobileNavDrawer({ open, onClose, ...props }: MobileNavDrawerProps) {
  const ts = useTranslations("shell");

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-modal lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
      inert={!open}
    >
      <div
        role="presentation"
        className={cn(
          "absolute inset-0 bg-overlay transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={ts("navigation")}
        className={cn(
          "absolute inset-y-0 left-0 flex w-72 max-w-[min(20rem,85vw)] flex-col border-r border-border bg-sidebar shadow-modal transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarPanel {...props} collapsed={false} showCollapseToggle={false} onNavigate={onClose} />
      </aside>
    </div>
  );
}

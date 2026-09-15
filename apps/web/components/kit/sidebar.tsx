"use client";

import type { ReactNode } from "react";
import type { SidebarGroup } from "./types";

type SidebarUser = {
  name: string;
  email: string;
  initials: string;
};

type SidebarProps = {
  brand: ReactNode;
  groups: SidebarGroup[];
  user?: SidebarUser;
  collapsed?: boolean;
  onToggle?: () => void;
  toggleLabel?: string;
};

function SidebarItemButton({
  label,
  icon,
  count,
  active,
  onClick,
}: {
  label: string;
  icon?: ReactNode;
  count?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const className = ["kit-sidebar__item", active ? "kit-sidebar__item--active" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" className={className} onClick={onClick}>
      {icon ? <span className="kit-sidebar__icon">{icon}</span> : null}
      <span className="kit-sidebar__label">{label}</span>
      {count ? <span className="kit-sidebar__count">{count}</span> : null}
    </button>
  );
}

export function Sidebar({
  brand,
  groups,
  user,
  collapsed = false,
  onToggle,
  toggleLabel = "Toggle sidebar",
}: SidebarProps) {
  const className = ["kit-sidebar", collapsed ? "kit-sidebar--collapsed" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className={className}>
      <div className="kit-sidebar__head">
        <div className="kit-sidebar__brand">{brand}</div>
        {onToggle ? (
          <button type="button" className="kit-sidebar__toggle" onClick={onToggle} aria-label={toggleLabel}>
            <span aria-hidden="true">{collapsed ? "›" : "‹"}</span>
          </button>
        ) : null}
      </div>
      <div className="kit-sidebar__content">
        {groups.map((group) => (
          <div key={group.label} className="kit-sidebar__group">
            <div className="kit-sidebar__group-label">{group.label}</div>
            <nav className="kit-sidebar__nav">
              {group.items.map((item) => (
                <SidebarItemButton
                  key={item.id}
                  label={item.label}
                  icon={item.icon}
                  count={item.count}
                  active={item.active}
                  onClick={item.onClick}
                />
              ))}
            </nav>
          </div>
        ))}
      </div>
      {user ? (
        <div className="kit-sidebar__footer">
          <div className="kit-sidebar__user">
            <span className="kit-sidebar__avatar">{user.initials}</span>
            <div className="kit-sidebar__user-meta">
              <span className="kit-sidebar__user-name">{user.name}</span>
              <span className="kit-sidebar__user-email">{user.email}</span>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

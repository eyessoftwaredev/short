import type { ReactNode } from "react";

export type SidebarItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
};

export type SidebarGroup = {
  label: string;
  items: SidebarItem[];
};

export type GridColumns = 2 | 3 | 4 | 12;

export type GridSpan = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 12;

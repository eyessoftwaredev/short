import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  Contact,
  CreditCard,
  Globe,
  Layers,
  LayoutDashboard,
  Link2,
  QrCode,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

/** Workspace membership roles plus the platform-level superadmin. */
export type PanelRole = "owner" | "admin" | "member" | "superadmin";

export const WORKSPACE_ROLES: PanelRole[] = ["owner", "admin", "member"];

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  count?: string;
  roles: PanelRole[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/**
 * Grouped by what the user is doing, not by which table the data lives in:
 * the two read-only reporting surfaces sit together, the three publishable
 * asset types sit together, and everything that configures the workspace is
 * kept out of the daily path.
 */
export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["owner", "admin", "member", "superadmin"],
      },
      {
        id: "analytics",
        label: "Analytics",
        href: "/analytics",
        icon: BarChart3,
        roles: ["owner", "admin", "member", "superadmin"],
      },
    ],
  },
  {
    label: "Manage",
    items: [
      {
        id: "links",
        label: "Links",
        href: "/links",
        icon: Link2,
        roles: ["owner", "admin", "member", "superadmin"],
      },
      {
        id: "qr",
        label: "QR codes",
        href: "/qr",
        icon: QrCode,
        roles: ["owner", "admin", "member", "superadmin"],
      },
      {
        id: "bio",
        label: "Bio pages",
        href: "/bio",
        icon: Contact,
        roles: ["owner", "admin", "member", "superadmin"],
      },
    ],
  },
  {
    label: "Configure",
    items: [
      {
        id: "domains",
        label: "Domains",
        href: "/domains",
        icon: Globe,
        roles: ["owner", "admin", "superadmin"],
      },
      {
        id: "settings",
        label: "Settings",
        href: "/settings",
        icon: Settings,
        roles: ["owner", "admin", "member", "superadmin"],
      },
      {
        id: "billing",
        label: "Billing",
        href: "/billing",
        icon: CreditCard,
        roles: ["owner", "superadmin"],
      },
      {
        id: "docs",
        label: "Components",
        href: "/docs",
        icon: BookOpen,
        roles: ["owner", "admin", "member", "superadmin"],
      },
    ],
  },
  {
    label: "Platform",
    items: [
      { id: "admin", label: "Overview", href: "/admin", icon: ShieldCheck, roles: ["superadmin"] },
      { id: "admin-users", label: "Users", href: "/admin/users", icon: Users, roles: ["superadmin"] },
      {
        id: "admin-workspaces",
        label: "Workspaces",
        href: "/admin/workspaces",
        icon: Building2,
        roles: ["superadmin"],
      },
      {
        id: "admin-links",
        label: "All links",
        href: "/admin/links",
        icon: Link2,
        roles: ["superadmin"],
      },
      {
        id: "admin-domains",
        label: "All domains",
        href: "/admin/domains",
        icon: Globe,
        roles: ["superadmin"],
      },
      { id: "admin-plans", label: "Plans", href: "/admin/plans", icon: Layers, roles: ["superadmin"] },
      {
        id: "admin-system",
        label: "System",
        href: "/admin/system",
        icon: Activity,
        roles: ["superadmin"],
      },
      {
        id: "admin-audit",
        label: "Audit log",
        href: "/admin/audit",
        icon: ScrollText,
        roles: ["superadmin"],
      },
    ],
  },
];

export const brandName = "Short";

/**
 * Superadmins see the Platform group in addition to everything a workspace owner sees,
 * so their effective role is the union rather than a separate list.
 */
export function getNavForRole(role: PanelRole): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);
}

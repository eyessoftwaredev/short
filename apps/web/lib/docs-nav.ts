import type { IconName } from "@/components/kit/icon";

export type DocsSectionId =
  | "overview"
  | "getting-started"
  | "links"
  | "qr-codes"
  | "bio-pages"
  | "domains"
  | "routing"
  | "analytics"
  | "api"
  | "webhooks";

export type DocsNavGroup = {
  labelKey: string;
  items: DocsNavItem[];
};

export type DocsNavItem = {
  id: DocsSectionId;
  href: string;
  icon: IconName;
  labelKey: string;
};

export const docsNavGroups: DocsNavGroup[] = [
  {
    labelKey: "navGroups.start",
    items: [
      { id: "overview", href: "/docs", icon: "book", labelKey: "nav.overview" },
      { id: "getting-started", href: "/docs/getting-started", icon: "bolt", labelKey: "nav.gettingStarted" },
    ],
  },
  {
    labelKey: "navGroups.guides",
    items: [
      { id: "links", href: "/docs/links", icon: "link", labelKey: "nav.links" },
      { id: "qr-codes", href: "/docs/qr-codes", icon: "qrcode", labelKey: "nav.qrCodes" },
      { id: "bio-pages", href: "/docs/bio-pages", icon: "address-card", labelKey: "nav.bioPages" },
      { id: "domains", href: "/docs/domains", icon: "globe", labelKey: "nav.domains" },
      { id: "routing", href: "/docs/routing", icon: "share-nodes", labelKey: "nav.routing" },
      { id: "analytics", href: "/docs/analytics", icon: "chart-line", labelKey: "nav.analytics" },
    ],
  },
  {
    labelKey: "navGroups.developers",
    items: [
      { id: "api", href: "/docs/api", icon: "code", labelKey: "nav.api" },
      { id: "webhooks", href: "/docs/webhooks", icon: "repeat", labelKey: "nav.webhooks" },
    ],
  },
];

export function docsSectionFromPath(pathname: string): DocsSectionId {
  if (pathname === "/docs") return "overview";
  const match = docsNavGroups
    .flatMap((group) => group.items)
    .find((item) => item.href !== "/docs" && pathname.startsWith(item.href));
  return match?.id ?? "overview";
}

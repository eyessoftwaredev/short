import { serverEnv, siteUrl } from "@/lib/env";

/** Worker sets this when proxying apex marketing paths so Traefik cannot lie about Host. */
export const SITE_SURFACE_HEADER = "x-short-surface";

export function panelUrl(path = "/"): string {
  const base = serverEnv().APP_URL.replace(/\/$/, "");
  if (path === "" || path === "/") {
    return `${base}/`;
  }
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function hostsAreSplit(): boolean {
  return new URL(serverEnv().APP_URL).host !== new URL(siteUrl()).host;
}

export function isSiteSurface(headerList: Headers): boolean {
  return headerList.get(SITE_SURFACE_HEADER) === "site";
}

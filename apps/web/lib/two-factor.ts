export function isTwoFactorRedirect(data: unknown): boolean {
  return Boolean(
    data &&
      typeof data === "object" &&
      "twoFactorRedirect" in data &&
      data.twoFactorRedirect === true,
  );
}

/**
 * Same-origin path only. Browsers read `\` as `/` and drop tabs/newlines, so `/\evil.com`
 * or `/\t/evil.com` would otherwise navigate off-site.
 */
export function safeInternalPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(raw)) {
    return fallback;
  }
  return raw;
}

export function twoFactorContinueHref(): string {
  if (typeof window === "undefined") {
    return "/two-factor";
  }

  const here = `${window.location.pathname}${window.location.search}`;
  if (here.startsWith("/two-factor")) {
    return here;
  }

  if (here.startsWith("/login")) {
    const next = new URLSearchParams(window.location.search).get("next");
    return next ? `/two-factor?next=${encodeURIComponent(safeInternalPath(next))}` : "/two-factor";
  }

  return `/two-factor?next=${encodeURIComponent(safeInternalPath(here))}`;
}

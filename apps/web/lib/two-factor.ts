export function isTwoFactorRedirect(data: unknown): boolean {
  return Boolean(
    data &&
      typeof data === "object" &&
      "twoFactorRedirect" in data &&
      data.twoFactorRedirect === true,
  );
}

export function safeInternalPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
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

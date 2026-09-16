export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export type UtmKey = (typeof UTM_KEYS)[number];
export type UtmParams = Partial<Record<UtmKey, string>>;

const BLOCKED_PROTOCOLS = new Set(["javascript:", "data:", "vbscript:", "file:", "blob:"]);

/** Rejects anything that is not an absolute http(s) URL, including `javascript:` payloads. */
export function isSafeDestination(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (BLOCKED_PROTOCOLS.has(url.protocol)) {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

/**
 * Adds a scheme when the user typed a bare host, so `acme.com/x` becomes a valid URL.
 * Control characters are stripped first: `new URL()` silently tolerates an embedded
 * CR/LF, but `new Headers()` rejects it, which would turn a stored destination into a
 * 500 on every redirect.
 */
export function normalizeDestination(raw: string): string {
  // eslint-disable-next-line no-control-regex
  const trimmed = raw.trim().replace(/[\u0000-\u001f\u007f]/g, "");
  if (trimmed === "") {
    return trimmed;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Merges UTM params into a destination. Stored link params are applied first, then
 * params from the inbound short-link request override them, so campaign overrides win.
 */
export function applyUtm(
  destination: string,
  stored: UtmParams | null | undefined,
  inbound?: URLSearchParams,
): string {
  let url: URL;
  try {
    url = new URL(destination);
  } catch {
    return destination;
  }

  for (const key of UTM_KEYS) {
    const value = stored?.[key];
    if (value != null && value !== "") {
      url.searchParams.set(key, value);
    }
  }

  if (inbound) {
    for (const key of UTM_KEYS) {
      const value = inbound.get(key);
      if (value != null && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  return url.toString();
}

/**
 * Forwards query params the visitor supplied onto the destination, skipping UTM keys
 * (handled by `applyUtm`) and keys the destination already defines.
 */
export function forwardQuery(destination: string, inbound: URLSearchParams): string {
  let url: URL;
  try {
    url = new URL(destination);
  } catch {
    return destination;
  }

  const utm = new Set<string>(UTM_KEYS);
  for (const [key, value] of inbound.entries()) {
    if (utm.has(key) || url.searchParams.has(key)) {
      continue;
    }
    url.searchParams.append(key, value);
  }

  return url.toString();
}

export function hostnameOf(raw: string): string {
  try {
    return new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Strips scheme, path and a leading www. so `https://www.acme.com/x` and `acme.com` match. */
export function normalizeHostInput(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "") {
    return "";
  }
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withScheme).hostname.replace(/^www\./, "");
  } catch {
    return trimmed.replace(/^www\./, "").split("/")[0] ?? "";
  }
}

/**
 * Swaps the hostname of an absolute URL. Path, query and hash stay. `www.` is ignored
 * on both sides so `www.acme.com` and `acme.com` are the same host. Returns `null` when
 * the input is not a URL; returns the original string when the host does not match.
 */
export function rewriteHostname(raw: string, from: string, to: string): string | null {
  const fromHost = normalizeHostInput(from);
  const toHost = normalizeHostInput(to);
  if (fromHost === "" || toHost === "" || !isValidHostname(fromHost) || !isValidHostname(toHost)) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (hostnameOf(raw) !== fromHost) {
    return raw;
  }

  url.hostname = toHost;
  return url.toString();
}

const HOSTNAME_PATTERN =
  /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

export function isValidHostname(raw: string): boolean {
  const host = raw.trim().toLowerCase();
  return host.length <= 253 && HOSTNAME_PATTERN.test(host);
}

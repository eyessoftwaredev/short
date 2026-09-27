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

function isPrivateIpv4(host: string): boolean {
  const octets = host.split(".").map((part) => Number.parseInt(part, 10));
  const [a = 0, b = 0, c = 0] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

function isPrivateIpv6(host: string): boolean {
  // `::`, `::1`, IPv4-mapped/compatible (`::ffff:7f00:1`), unique-local and link-local.
  return host.startsWith("::") || /^f[cd]/.test(host) || /^fe[89ab]/.test(host);
}

/**
 * For URLs the server fetches on a customer's behalf (webhooks). On top of the scheme
 * allowlist it rejects embedded credentials, `localhost`, single-label and internal-only
 * names, and literal loopback/private/link-local addresses, so a webhook cannot be aimed
 * at the panel's own network. The URL parser canonicalises decimal/hex/octal IPv4 forms
 * first, so `http://2130706433/` is caught as `127.0.0.1`.
 *
 * A public name can still resolve to a private address; the dispatcher has to re-check
 * the resolved IP. This only closes the direct cases at write time.
 */
export function isPublicHttpUrl(raw: string): boolean {
  if (!isSafeDestination(raw)) {
    return false;
  }
  const url = new URL(raw);
  if (url.username !== "" || url.password !== "") {
    return false;
  }
  const host = url.hostname.toLowerCase().replace(/\.+$/, "");
  if (host.startsWith("[")) {
    return !isPrivateIpv6(host.slice(1, -1));
  }
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    return !isPrivateIpv4(host);
  }
  if (!host.includes(".")) {
    return false;
  }
  return !/(?:^|\.)(?:localhost|local|internal|localdomain|home\.arpa)$/.test(host);
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

/**
 * Parent Domain= value so `app.short.ky` and `short.ky` share a cookie.
 * Localhost and raw IPs stay host-only.
 */
export function parentCookieDomain(hostname: string): string | undefined {
  const host = hostname
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/^(www|app)\./, "");
  if (host === "" || host === "localhost" || host.endsWith(".localhost")) {
    return undefined;
  }
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    return undefined;
  }
  if (!host.includes(".")) {
    return undefined;
  }
  return `.${host}`;
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

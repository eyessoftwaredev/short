/**
 * Hostname helpers shared by the add form (client) and the domain actions (server).
 * Plain functions only — no server or browser APIs.
 */

/**
 * Second-level suffixes where the registrable domain has three labels
 * (`acme.com.tr`, `acme.co.uk`). Not the full public-suffix list, just the ones
 * customers of this product actually use; anything else falls back to two labels.
 */
const MULTI_PART_SUFFIXES = new Set([
  "com.tr",
  "net.tr",
  "org.tr",
  "gen.tr",
  "biz.tr",
  "web.tr",
  "av.tr",
  "k12.tr",
  "edu.tr",
  "gov.tr",
  "co.uk",
  "org.uk",
  "me.uk",
  "com.au",
  "net.au",
  "co.nz",
  "co.za",
  "co.jp",
  "com.br",
  "com.mx",
  "com.ar",
  "co.in",
  "com.sg",
  "com.cn",
]);

/**
 * People paste whatever is in their address bar: `https://go.acme.com/`, `GO.ACME.COM`,
 * `go.acme.com:443`. Reduce it to the bare hostname before validating.
 */
export function cleanHostnameInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .replace(/^[^@/]*@/, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/^\*\./, "")
    .replace(/\.+$/, "");
}

/** `go.acme.com.tr` → `acme.com.tr`. */
export function registrableDomain(hostname: string): string {
  const labels = hostname.split(".").filter(Boolean);
  if (labels.length <= 2) {
    return labels.join(".");
  }
  const lastTwo = labels.slice(-2).join(".");
  const take = MULTI_PART_SUFFIXES.has(lastTwo) ? 3 : 2;
  return labels.slice(-take).join(".");
}

/** True for `acme.com` itself: many DNS providers refuse a CNAME there. */
export function isApexHostname(hostname: string): boolean {
  return registrableDomain(hostname) === hostname;
}

/**
 * The "host" field most DNS dashboards want: the record name without the zone,
 * which they append themselves. `_cf-custom-hostname.go.acme.com` → `_cf-custom-hostname.go`.
 * Returns `@` for the apex.
 */
export function relativeRecordName(name: string, apex: string): string {
  const clean = name.replace(/\.$/, "").toLowerCase();
  if (clean === apex) {
    return "@";
  }
  const suffix = `.${apex}`;
  return clean.endsWith(suffix) ? clean.slice(0, -suffix.length) : clean;
}

/** Adds `https://` to a bare `acme.com` so a destination field accepts what people type. */
export function withScheme(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "" || /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

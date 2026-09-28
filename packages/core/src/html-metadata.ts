/**
 * Title / description / preview image / favicon from a page's `<head>`, for prefilling
 * the link editor. Regex-based on purpose: the input is untrusted, capped in size by the
 * caller, and only a handful of tags matter, so a DOM parser would be all cost.
 */
export type LinkMetadata = {
  title: string | null;
  description: string | null;
  /** Absolute http(s) URL of the og:/twitter: image. */
  image: string | null;
  /** Absolute http(s) URL of the best `<link rel="icon">`, if the page declares one. */
  favicon: string | null;
  siteName: string | null;
};

export const EMPTY_LINK_METADATA: LinkMetadata = {
  title: null,
  description: null,
  image: null,
  favicon: null,
  siteName: null,
};

const MAX_TITLE = 255;
const MAX_DESCRIPTION = 1024;
const MAX_SITE_NAME = 120;
const MAX_URL = 2048;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  middot: "·",
  bull: "•",
  copy: "©",
  reg: "®",
  trade: "™",
};

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1] === "x" || entity[1] === "X"
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      // Surrogates, NUL and out-of-range code points would throw or smuggle junk.
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
        return match;
      }
      return String.fromCodePoint(code);
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function cleanText(raw: string | undefined, max: number): string | null {
  if (raw == null) {
    return null;
  }
  const text = decodeHtmlEntities(raw)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text === "") {
    return null;
  }
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Only absolute http(s) URLs survive; `javascript:`, `data:` and friends are dropped. */
export function resolveHttpUrl(raw: string | undefined, base: string): string | null {
  if (raw == null) {
    return null;
  }
  const value = decodeHtmlEntities(raw).trim();
  if (value === "") {
    return null;
  }
  let url: URL;
  try {
    url = new URL(value, base);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }
  if (url.username || url.password) {
    return null;
  }
  const out = url.toString();
  return out.length > MAX_URL ? null : out;
}

type Attributes = Record<string, string>;

const ATTRIBUTE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function parseAttributes(source: string): Attributes {
  const attributes: Attributes = {};
  for (const match of source.matchAll(ATTRIBUTE)) {
    const name = match[1]?.toLowerCase();
    if (!name || name in attributes) {
      continue;
    }
    attributes[name] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attributes;
}

/** The `<head>` (or the whole prefix when the page never closes it). */
function headOf(html: string): string {
  const end = html.search(/<\/head\s*>/i);
  return end >= 0 ? html.slice(0, end) : html;
}

type IconCandidate = { href: string; score: number };

function iconScore(rel: string[], attributes: Attributes): number {
  const type = (attributes.type ?? "").toLowerCase();
  const sizes = (attributes.sizes ?? "").toLowerCase();
  let score = 0;
  if (rel.includes("icon")) {
    score += 10;
  }
  if (rel.includes("apple-touch-icon") || rel.includes("apple-touch-icon-precomposed")) {
    score += 6;
  }
  if (type.includes("svg") || sizes === "any") {
    score += 3;
  }
  const size = Number.parseInt(sizes.split("x")[0] ?? "", 10);
  if (Number.isFinite(size)) {
    // Prefer something crisp at 32–64px over a 16px sprite or a 512px splash.
    score += size >= 32 && size <= 192 ? 2 : 1;
  }
  return score;
}

export function parseHtmlMetadata(html: string, pageUrl: string): LinkMetadata {
  const head = headOf(html);

  let base = pageUrl;
  const baseTag = /<base\b([^>]*)>/i.exec(head);
  if (baseTag) {
    base = resolveHttpUrl(parseAttributes(baseTag[1] ?? "").href, pageUrl) ?? pageUrl;
  }

  const meta = new Map<string, string>();
  const icons: IconCandidate[] = [];

  for (const match of head.matchAll(/<(meta|link)\b([^>]*)>/gi)) {
    const tag = match[1]?.toLowerCase();
    const attributes = parseAttributes(match[2] ?? "");
    if (tag === "meta") {
      const key = (attributes.property ?? attributes.name ?? attributes.itemprop ?? "").toLowerCase();
      const content = attributes.content;
      if (key !== "" && content !== undefined && !meta.has(key)) {
        meta.set(key, content);
      }
      continue;
    }
    const rel = (attributes.rel ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    const href = resolveHttpUrl(attributes.href, base);
    if (!href || rel.includes("mask-icon")) {
      continue;
    }
    const score = iconScore(rel, attributes);
    if (score > 0) {
      icons.push({ href, score });
    }
  }

  const titleTag = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(head)?.[1];
  const pick = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = meta.get(key);
      if (value !== undefined && value.trim() !== "") {
        return value;
      }
    }
    return undefined;
  };

  const image =
    resolveHttpUrl(pick("og:image:secure_url", "og:image", "og:image:url"), base) ??
    resolveHttpUrl(pick("twitter:image", "twitter:image:src", "image"), base);

  icons.sort((a, b) => b.score - a.score);

  return {
    title: cleanText(pick("og:title", "twitter:title") ?? titleTag, MAX_TITLE),
    description: cleanText(pick("og:description", "twitter:description", "description"), MAX_DESCRIPTION),
    image,
    favicon: icons[0]?.href ?? null,
    siteName: cleanText(pick("og:site_name", "application-name", "apple-mobile-web-app-title"), MAX_SITE_NAME),
  };
}

/**
 * Charset for decoding the body: the `Content-Type` header wins, then a `<meta charset>`
 * or `http-equiv` declaration in the first bytes, then UTF-8.
 */
export function detectCharset(contentType: string | null, headSample: string): string {
  const fromHeader = /charset\s*=\s*["']?([\w.:-]+)/i.exec(contentType ?? "")?.[1];
  if (fromHeader) {
    return fromHeader.toLowerCase();
  }
  const fromMeta =
    /<meta\b[^>]*\bcharset\s*=\s*["']?([\w.:-]+)/i.exec(headSample)?.[1] ??
    /<meta\b[^>]*content\s*=\s*["'][^"']*charset=([\w.:-]+)/i.exec(headSample)?.[1];
  return (fromMeta ?? "utf-8").toLowerCase();
}

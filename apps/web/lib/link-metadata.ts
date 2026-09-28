import { createHash } from "node:crypto";
import {
  detectCharset,
  isPublicHttpUrl,
  normalizeDestination,
  parseHtmlMetadata,
  resolveHttpUrl,
  type LinkMetadata,
} from "@short/core";
import { cacheGet, cacheSet } from "./redis";
import { SafeHttpError, safeHttpRequest } from "./safe-http";

/** Metadata plus the URL it was read from after redirects. */
export type FetchedLinkMetadata = LinkMetadata & { url: string };

const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;
/** `<head>` is almost always in the first few KB; 512 KB covers bloated inline CSS. */
const MAX_BYTES = 512 * 1024;
const CACHE_SECONDS = 600;

export type LinkMetadataErrorCode = "invalid_url" | "unreachable" | "not_found";

export class LinkMetadataError extends Error {
  constructor(readonly code: LinkMetadataErrorCode) {
    super(`Link metadata unavailable: ${code}`);
    this.name = "LinkMetadataError";
  }
}

function cacheKey(url: string): string {
  return `link-meta:${createHash("sha256").update(url).digest("hex")}`;
}

function headerValue(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function decodeBody(body: Buffer, contentType: string | null): string {
  const charset = detectCharset(contentType, body.subarray(0, 4096).toString("latin1"));
  try {
    return new TextDecoder(charset).decode(body);
  } catch {
    // Unknown label (or a runtime without that codec): UTF-8 with replacement chars.
    return new TextDecoder("utf-8").decode(body);
  }
}

function faviconFallback(pageUrl: string): string | null {
  return resolveHttpUrl("/favicon.ico", pageUrl);
}

/**
 * Title, description, preview image, favicon and site name of a destination, for
 * prefilling the link editor. SSRF-safe (see `safeHttpRequest`): public http(s) hosts
 * only, 5 s for the whole exchange, at most 3 redirects (each re-validated), and at most
 * 512 KB of body read. Results are cached for 10 minutes per URL.
 */
export async function fetchLinkMetadata(rawUrl: string): Promise<FetchedLinkMetadata> {
  const url = normalizeDestination(rawUrl);
  if (url.length > 2048 || !isPublicHttpUrl(url)) {
    throw new LinkMetadataError("invalid_url");
  }

  const key = cacheKey(url);
  const cached = await cacheGet<FetchedLinkMetadata>(key);
  if (cached) {
    return cached;
  }

  let response;
  try {
    response = await safeHttpRequest(url, {
      method: "GET",
      timeoutMs: TIMEOUT_MS,
      maxRedirects: MAX_REDIRECTS,
      maxBytes: MAX_BYTES,
      headers: { "accept-language": "en,tr;q=0.8,*;q=0.5" },
    });
  } catch (error) {
    if (error instanceof SafeHttpError) {
      throw new LinkMetadataError(error.failure === "unsafe_url" ? "invalid_url" : "unreachable");
    }
    throw error;
  }

  if (response.status < 200 || response.status >= 300) {
    // A 403 challenge page or a 404 template would only yield a misleading title.
    throw new LinkMetadataError(response.status === 404 || response.status === 410 ? "not_found" : "unreachable");
  }

  const contentType = headerValue(response.headers["content-type"]);
  const mime = (contentType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  let metadata: LinkMetadata;
  if (mime === "" || mime === "text/html" || mime === "application/xhtml+xml") {
    metadata = parseHtmlMetadata(decodeBody(response.body, contentType), response.url);
  } else {
    // A direct link to an image is its own preview; anything else has no metadata.
    metadata = {
      title: null,
      description: null,
      image: mime.startsWith("image/") ? resolveHttpUrl(response.url, response.url) : null,
      favicon: null,
      siteName: null,
    };
  }

  const result: FetchedLinkMetadata = {
    ...metadata,
    favicon: metadata.favicon ?? faviconFallback(response.url),
    url: response.url,
  };
  await cacheSet(key, result, CACHE_SECONDS);
  return result;
}

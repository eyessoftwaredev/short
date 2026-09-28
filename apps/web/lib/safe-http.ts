import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { lookup as dnsLookupAsync } from "node:dns/promises";
import http, { type IncomingHttpHeaders, type IncomingMessage } from "node:http";
import https from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";
import type { Readable } from "node:stream";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";

/**
 * Server-side fetching of customer-supplied URLs (webhooks, link metadata, the link
 * health monitor). Everything here exists so such a URL cannot be aimed at the panel's
 * own network: loopback, RFC 1918, link-local (cloud metadata at 169.254.169.254),
 * CGNAT, multicast/reserved and their IPv6 equivalents are refused, both when the URL is
 * checked and — for `safeHttpRequest` — at connect time, through a DNS lookup that
 * rejects private answers, so a rebinding name cannot swap addresses in between.
 */

/** IPv4-mapped IPv6 addresses are matched against the IPv4 ranges by `BlockList` itself. */
const PRIVATE_RANGES = (() => {
  const list = new BlockList();
  for (const [network, prefix] of [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
  ] as const) {
    list.addSubnet(network, prefix, "ipv4");
  }
  for (const [network, prefix] of [
    ["::", 128],
    ["::1", 128],
    ["64:ff9b::", 96],
    ["100::", 64],
    ["2001:db8::", 32],
    ["fc00::", 7],
    ["fe80::", 10],
    ["ff00::", 8],
  ] as const) {
    list.addSubnet(network, prefix, "ipv6");
  }
  return list;
})();

/** Anything that is not a literal public IP counts as private. */
export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) {
    return true;
  }
  return PRIVATE_RANGES.check(address, family === 4 ? "ipv4" : "ipv6");
}

export type UnsafeUrlReason = "invalid" | "protocol" | "credentials" | "unresolvable" | "private";

export class UnsafeUrlError extends Error {
  constructor(readonly reason: UnsafeUrlReason) {
    super(`URL rejected: ${reason}`);
    this.name = "UnsafeUrlError";
  }
}

function parseHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("invalid");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new UnsafeUrlError("protocol");
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError("credentials");
  }
  return url;
}

/**
 * http(s) only, no embedded credentials, and every address the host resolves to must be
 * public. DNS can change after the check, so callers that connect themselves should use
 * `safeHttpRequest`, which re-checks the address it actually connects to.
 */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  const url = parseHttpUrl(raw);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [host]
    : await dnsLookupAsync(host, { all: true, verbatim: true })
        .then((rows) => rows.map((row) => row.address))
        .catch(() => {
          throw new UnsafeUrlError("unresolvable");
        });

  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new UnsafeUrlError("private");
  }
  return url;
}

/** `dns.lookup` that fails instead of answering with a private address. */
const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses: LookupAddress[]) => {
    if (error) {
      callback(error, options.all ? [] : "", 0);
      return;
    }
    if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
      callback(new UnsafeUrlError("private") as NodeJS.ErrnoException, options.all ? [] : "", 0);
      return;
    }
    if (options.all) {
      callback(null, addresses);
      return;
    }
    const first = addresses[0] as LookupAddress;
    callback(null, first.address, first.family);
  });
};

export type SafeHttpFailure = "unsafe_url" | "dns" | "timeout" | "network";

export class SafeHttpError extends Error {
  constructor(
    readonly failure: SafeHttpFailure,
    message: string,
  ) {
    super(message);
    this.name = "SafeHttpError";
  }
}

export type SafeHttpOptions = {
  method?: "GET" | "HEAD";
  /** One deadline for the whole exchange, redirects and body included. */
  timeoutMs: number;
  maxRedirects: number;
  /** Body bytes kept (after decompression); the rest is never read. 0 skips the body. */
  maxBytes?: number;
  headers?: Record<string, string>;
};

export type SafeHttpResponse = {
  /** The URL that produced this response, after redirects. */
  url: string;
  status: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
  truncated: boolean;
  redirects: number;
  /** True when the last response is still a redirect because `maxRedirects` ran out. */
  redirectLimitHit: boolean;
};

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function requestOnce(
  url: URL,
  method: "GET" | "HEAD",
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const request = client.request(
      url,
      // No shared agent: a pooled socket could outlive the address check it was made for.
      { method, headers, lookup: guardedLookup, signal, agent: false },
      resolve,
    );
    request.on("error", reject);
    request.end();
  });
}

function decoded(response: IncomingMessage): Readable {
  const encoding = String(response.headers["content-encoding"] ?? "").trim().toLowerCase();
  if (encoding === "gzip" || encoding === "x-gzip") {
    return response.pipe(createGunzip());
  }
  if (encoding === "deflate") {
    return response.pipe(createInflate());
  }
  if (encoding === "br") {
    return response.pipe(createBrotliDecompress());
  }
  return response;
}

/** Reads at most `maxBytes` of the (decompressed) body, so a bomb costs nothing extra. */
async function readCapped(
  response: IncomingMessage,
  maxBytes: number,
): Promise<{ body: Buffer; truncated: boolean }> {
  const chunks: Buffer[] = [];
  let size = 0;
  let truncated = false;
  const stream = decoded(response);
  try {
    for await (const chunk of stream) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
      const room = maxBytes - size;
      if (buffer.length >= room) {
        chunks.push(buffer.subarray(0, room));
        size += room;
        truncated = buffer.length > room;
        break;
      }
      chunks.push(buffer);
      size += buffer.length;
    }
  } catch (error) {
    // A connection cut (or deadline) mid-body still leaves a usable prefix.
    if (size === 0) {
      throw error;
    }
    truncated = true;
  } finally {
    stream.destroy();
    response.destroy();
  }
  return { body: Buffer.concat(chunks, size), truncated };
}

function toSafeHttpError(error: unknown, signal: AbortSignal): SafeHttpError {
  if (error instanceof SafeHttpError) {
    return error;
  }
  if (error instanceof UnsafeUrlError) {
    return new SafeHttpError(error.reason === "unresolvable" ? "dns" : "unsafe_url", error.message);
  }
  if (signal.aborted) {
    return new SafeHttpError("timeout", "Request timed out");
  }
  const code = (error as NodeJS.ErrnoException | null)?.code ?? "";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN" || code === "ENODATA") {
    return new SafeHttpError("dns", code);
  }
  if (code === "ABORT_ERR" || code === "ETIMEDOUT") {
    return new SafeHttpError("timeout", code);
  }
  return new SafeHttpError("network", code || (error instanceof Error ? error.message : "Request failed"));
}

export const SAFE_HTTP_USER_AGENT = "Mozilla/5.0 (compatible; ShortLinkBot/1.0)";

/**
 * GET/HEAD a customer-supplied URL. Redirects are followed by hand so every hop is
 * validated; the last redirect is returned as-is once `maxRedirects` is used up.
 * Throws `SafeHttpError` when no HTTP response could be obtained at all.
 */
export async function safeHttpRequest(raw: string, options: SafeHttpOptions): Promise<SafeHttpResponse> {
  const method = options.method ?? "GET";
  const maxBytes = options.maxBytes ?? 0;
  const headers: Record<string, string> = {
    "user-agent": SAFE_HTTP_USER_AGENT,
    accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    "accept-encoding": "gzip, deflate, br",
    ...options.headers,
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    let current = await assertPublicHttpUrl(raw);
    for (let redirects = 0; ; redirects += 1) {
      const response = await requestOnce(current, method, headers, controller.signal);
      const status = response.statusCode ?? 0;
      const location = response.headers.location;

      if (REDIRECT_STATUSES.has(status) && typeof location === "string" && location !== "") {
        if (redirects >= options.maxRedirects) {
          response.destroy();
          return {
            url: current.toString(),
            status,
            headers: response.headers,
            body: Buffer.alloc(0),
            truncated: false,
            redirects,
            redirectLimitHit: true,
          };
        }
        response.destroy();
        let next: URL;
        try {
          next = new URL(location, current);
        } catch {
          throw new SafeHttpError("network", "Invalid redirect location");
        }
        current = await assertPublicHttpUrl(next.toString());
        continue;
      }

      if (method === "HEAD" || maxBytes <= 0) {
        response.destroy();
        return {
          url: current.toString(),
          status,
          headers: response.headers,
          body: Buffer.alloc(0),
          truncated: false,
          redirects,
          redirectLimitHit: false,
        };
      }

      const { body, truncated } = await readCapped(response, maxBytes);
      return {
        url: current.toString(),
        status,
        headers: response.headers,
        body,
        truncated,
        redirects,
        redirectLimitHit: false,
      };
    }
  } catch (error) {
    throw toSafeHttpError(error, controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

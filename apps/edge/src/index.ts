import {
  applyUtm,
  forwardQuery,
  isBiopageLive,
  isSafeDestination,
  parseAcceptLanguage,
  parseUserAgent,
  resolveDestination,
  verifyGatePassword,
  type EventType,
  type LinkKvRecord,
  type Resolution,
  type VisitorContext,
} from "@short/core";
import type { EdgeEnv } from "./env";
import { cloakHtml, passwordGateHtml } from "./html";
import { gateCookieName, gateCookieValue, readCookie, verifyGateCookie } from "./password";
import { resolveTarget } from "./resolve";
import { buildEvent, enqueue, type TrackContext } from "./track";

/** Paths the worker answers itself instead of treating as a slug. */
const PASSTHROUGH_PREFIXES = ["/.well-known/", "/cdn-cgi/"];

/**
 * Panel routes that must never be resolved as a short-link slug. Apex visitors who
 * type these land on the origin instead of a 404 or a stolen slug.
 */
const PLATFORM_PATHS = new Set([
  "/login",
  "/register",
  "/forgot",
  "/reset",
  "/onboarding",
  "/dashboard",
  "/analytics",
  "/links",
  "/qr",
  "/bio",
  "/domains",
  "/settings",
  "/billing",
  "/docs",
  "/admin",
  "/invite",
]);

const PLATFORM_PREFIXES = ["/_next/", "/api/", "/invite/", "/admin/"];

/** Marketing routes on the platform apex. Must not be resolved as slugs or 302'd to the panel. */
const SITE_PATHS = new Set(["/", "/pricing", "/terms", "/privacy", "/cookies", "/sitemap.xml"]);

function firstSegment(pathname: string): string {
  return `/${pathname.split("/").filter(Boolean)[0] ?? ""}`;
}

function isPlatformPath(pathname: string): boolean {
  const first = firstSegment(pathname);
  return PLATFORM_PATHS.has(first) || PLATFORM_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isSitePath(pathname: string): boolean {
  return pathname === "/" || SITE_PATHS.has(firstSegment(pathname));
}

/** Apex marketing HTML plus the Next assets it loads. Must be proxied, not 302'd. */
function isApexSiteRequest(pathname: string): boolean {
  return (
    isSitePath(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/brand") ||
    pathname.startsWith("/api/landing")
  );
}

/** `https://app.short.ky` → `short.ky`. Local `app.test` → `test`. */
function platformApexHost(env: EdgeEnv): string {
  return new URL(env.ORIGIN_URL).hostname.toLowerCase().replace(/^app\./, "");
}

const ROBOTS_ALLOW = "User-agent: *\nAllow: /\n";

/** Gate cookies are valid for a day, and the stamp is signed so the server enforces it. */
const GATE_TTL_MS = 86_400_000;
const GATE_MAX_ATTEMPTS = 10;
const GATE_WINDOW_SECONDS = 600;

/**
 * Upstream headers that are safe to hand to a visitor on a customer's own hostname.
 * Copying the full set would republish the origin's `Set-Cookie` under that domain.
 */
const PROXYABLE_HEADERS = [
  "content-type",
  "content-language",
  "etag",
  "last-modified",
  "vary",
  "link",
];

function redirectPermanent(destination: string): Response {
  return new Response(null, {
    status: 301,
    headers: {
      location: destination,
      "cache-control": "public, max-age=86400",
    },
  });
}

/**
 * Traefik often overwrites `X-Forwarded-Host`, so Next keys off `x-short-surface`
 * rather than Host when deciding whether `/` is the landing or the panel.
 */
const SITE_FORWARD_HEADERS = [
  "accept-language",
  "accept",
  "user-agent",
  "cookie",
  "content-type",
  "content-length",
  "origin",
  "referer",
  "rsc",
  "next-action",
  "next-router-state-tree",
  "next-router-prefetch",
  "next-router-segment-prefetch",
  "next-url",
  "x-forwarded-for",
] as const;

function siteProxyHeaders(request: Request, host: string): Record<string, string> {
  const headers: Record<string, string> = {
    accept: request.headers.get("accept") ?? "text/html",
    // Next keys RSC + Server Actions off Host; Traefik only routes by backend, so
    // the apex hostname must survive the hop to app.short.ky.
    host,
    "x-short-surface": "site",
    "x-forwarded-host": host,
    "x-forwarded-proto": "https",
  };
  const clientIp = request.headers.get("cf-connecting-ip");
  if (clientIp) {
    headers["x-forwarded-for"] = clientIp;
  }
  for (const name of SITE_FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) {
      headers[name] = value;
    }
  }
  return headers;
}

async function proxySite(request: Request, env: EdgeEnv, url: URL): Promise<Response> {
  const target = new URL(url.pathname + url.search, env.ORIGIN_URL);
  const method = request.method;
  const hasBody = method !== "GET" && method !== "HEAD";
  try {
    const upstream = await fetch(target.toString(), {
      method,
      headers: siteProxyHeaders(request, url.hostname),
      body: hasBody ? request.body : undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      ...(hasBody ? { duplex: "half" as const } : {}),
    });

    const headers = new Headers();
    const originHost = new URL(env.ORIGIN_URL).hostname.toLowerCase();
    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get("location");
      if (location) {
        try {
          const resolved = new URL(location, env.ORIGIN_URL);
          if (resolved.hostname.toLowerCase() === originHost) {
            resolved.hostname = url.hostname;
            resolved.protocol = "https:";
            headers.set("location", resolved.toString());
          } else {
            headers.set("location", location);
          }
        } catch {
          headers.set("location", location);
        }
      }
    }
    for (const name of PROXYABLE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) {
        headers.set(name, value);
      }
    }
    const vary = headers.get("vary");
    headers.set("vary", vary && !/\bcookie\b/i.test(vary) ? `${vary}, cookie` : (vary ?? "cookie"));
    const personalized = Boolean(request.headers.get("cookie") || request.headers.get("rsc"));
    headers.set(
      "cache-control",
      personalized
        ? "private, no-cache, no-store"
        : (upstream.headers.get("cache-control") ?? "public, max-age=0, must-revalidate"),
    );
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return new Response("Bad gateway", { status: 502, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
}

function redirect(destination: string, noIndex: boolean): Response {
  const headers = new Headers({
    location: destination,
    // Short links must never be cached: the destination can change at any time.
    "cache-control": "no-store, max-age=0",
    // Pass the original referrer through so the destination's own analytics still work.
    "referrer-policy": "unsafe-url",
  });
  if (noIndex) {
    headers.set("x-robots-tag", "noindex, nofollow");
  }
  return new Response(null, { status: 302, headers });
}

function notFound(env: EdgeEnv, fallback: string | null): Response {
  const candidate = fallback ?? env.DEFAULT_NOT_FOUND;
  const destination = candidate && isSafeDestination(candidate) ? candidate : "";
  if (destination) {
    return redirect(destination, true);
  }
  return new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex" },
  });
}

function buildVisitorContext(
  cf: IncomingRequestCfProperties | undefined,
  ua: ReturnType<typeof parseUserAgent>,
  language: string,
  referrer: string,
): VisitorContext {
  return {
    country: String(cf?.country ?? "").toUpperCase(),
    continent: String(cf?.continent ?? "").toUpperCase(),
    region: String(cf?.region ?? ""),
    city: String(cf?.city ?? ""),
    device: ua.device,
    os: ua.os,
    browser: ua.browser,
    language,
    referrer,
    now: new Date(),
  };
}

/**
 * Deep links are a device convenience, not an explicit targeting decision, so they only
 * apply when no rule and no A/B variant claimed the visit.
 */
function applyDeepLink(link: LinkKvRecord, resolution: Resolution, os: string): Resolution {
  if (resolution.source !== "default") {
    return resolution;
  }
  if (os === "ios" && link.iosDestination) {
    return { ...resolution, destination: link.iosDestination };
  }
  if (os === "android" && link.androidDestination) {
    return { ...resolution, destination: link.androidDestination };
  }
  return resolution;
}

type GateTarget = { id: string; passwordHash: string | null; title: string | null };

function gateChallenge(target: GateTarget, error: boolean, status = 401): Response {
  return new Response(passwordGateHtml({ title: target.title ?? "Protected link", error }), {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" },
  });
}

/**
 * Soft attempt limit. KV is eventually consistent so a determined attacker gets a few
 * extra tries, but it turns an unbounded online brute force — each attempt costing the
 * worker 100k PBKDF2 rounds — into a trickle without needing a Durable Object.
 */
async function gateAttemptsExceeded(env: EdgeEnv, linkId: string, ip: string): Promise<boolean> {
  const key = `gate-attempts:${linkId}:${ip}`;
  try {
    const current = Number.parseInt((await env.LINKS.get(key)) ?? "0", 10);
    if (Number.isFinite(current) && current >= GATE_MAX_ATTEMPTS) {
      return true;
    }
    await env.LINKS.put(key, String((Number.isFinite(current) ? current : 0) + 1), {
      expirationTtl: GATE_WINDOW_SECONDS,
    });
    return false;
  } catch {
    // Never lock a legitimate visitor out because KV hiccuped.
    return false;
  }
}

async function handlePasswordGate(
  request: Request,
  env: EdgeEnv,
  target: GateTarget,
): Promise<Response | null> {
  if (!target.passwordHash) {
    return null;
  }

  const cookieName = gateCookieName(target.id);
  const presented = readCookie(request.headers.get("cookie"), cookieName);

  if (await verifyGateCookie(presented, target.id, target.passwordHash, env.VISITOR_SALT)) {
    return null;
  }

  if (request.method === "POST") {
    const ip = request.headers.get("cf-connecting-ip") ?? "";
    if (await gateAttemptsExceeded(env, target.id, ip)) {
      return gateChallenge(target, true, 429);
    }

    let submitted = "";
    try {
      const form = await request.formData();
      submitted = String(form.get("password") ?? "");
    } catch {
      // A non-form body is a malformed submission, not a reason to 500 the worker.
      return gateChallenge(target, true);
    }

    if (await verifyGatePassword(submitted, target.passwordHash)) {
      const expiresAt = Date.now() + GATE_TTL_MS;
      const value = await gateCookieValue(target.id, target.passwordHash, env.VISITOR_SALT, expiresAt);

      return new Response(null, {
        status: 303,
        headers: {
          location: request.url,
          "set-cookie": `${cookieName}=${value}; Path=/; Max-Age=${GATE_TTL_MS / 1000}; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }

    return gateChallenge(target, true);
  }

  return gateChallenge(target, false);
}

/** Biopages are rendered by the Next.js app; the worker only proxies and tracks the view. */
async function proxyBiopage(env: EdgeEnv, request: Request, handle: string): Promise<Response> {
  // The panel serves biopages from its own `/{handle}` route with ISR, so the worker
  // proxies straight to it instead of duplicating the renderer at the edge.
  const incomingHost = new URL(request.url).hostname;
  const target = new URL(`/${encodeURIComponent(handle)}`, env.ORIGIN_URL);
  const upstream = await fetch(target.toString(), {
    headers: {
      "accept-language": request.headers.get("accept-language") ?? "",
      "user-agent": request.headers.get("user-agent") ?? "",
      // Traefik overwrites X-Forwarded-Host to the panel hostname. These two
      // survive that hop so the origin still looks the handle up on the public host.
      "x-short-surface": "bio",
      "x-short-host": incomingHost,
      "x-forwarded-host": incomingHost,
      "x-forwarded-proto": "https",
    },
    signal: AbortSignal.timeout(8000),
  });

  // Rebuilt from an allowlist rather than copied: the response is served on a customer's
  // own hostname, so anything the origin sets — `Set-Cookie` above all — must not travel.
  const headers = new Headers();
  for (const name of PROXYABLE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }
  headers.set("cache-control", "public, max-age=0, s-maxage=60");

  return new Response(upstream.body, { status: upstream.status, headers });
}

export default {
  async fetch(
    request: Request<unknown, IncomingRequestCfProperties>,
    env: EdgeEnv,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname;

    // The route pattern can cover the panel's own hostname; serving it as a slug would
    // black-hole the app and let the passthrough below recurse into this worker.
    if (hostname === new URL(env.ORIGIN_URL).hostname) {
      return fetch(request);
    }

    if (pathname === "/robots.txt") {
      return new Response(ROBOTS_ALLOW, {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    const apex = platformApexHost(env);
    if (hostname === `www.${apex}`) {
      const canonical = new URL(url.toString());
      canonical.hostname = apex;
      canonical.protocol = "https:";
      return redirectPermanent(canonical.toString());
    }

    if (hostname === apex && isApexSiteRequest(pathname)) {
      return proxySite(request, env, url);
    }

    if (isPlatformPath(pathname)) {
      return redirect(new URL(pathname + url.search, env.ORIGIN_URL).toString(), true);
    }

    if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD, POST" } });
    }

    if (PASSTHROUGH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      // ACME and Cloudflare probes are GETs. Forwarding the visitor's original request
      // object would hand the origin their cookies, auth header and body verbatim, so a
      // fresh request with a minimal header set is built instead.
      if (request.method === "POST") {
        return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
      }
      // An encoded separator survives URL normalisation and could re-expand past the
      // prefix once the origin decodes it.
      if (/%2f|%5c/i.test(pathname)) {
        return new Response("Not found", { status: 404 });
      }

      return fetch(new URL(pathname + url.search, env.ORIGIN_URL).toString(), {
        method: request.method,
        headers: {
          accept: request.headers.get("accept") ?? "*/*",
          "user-agent": request.headers.get("user-agent") ?? "",
        },
        signal: AbortSignal.timeout(5000),
      });
    }

    const segments = pathname.split("/").filter((segment) => segment !== "");
    let slug = "";
    try {
      slug = decodeURIComponent(segments[0] ?? "");
    } catch {
      slug = segments[0] ?? "";
    }

    const target = await resolveTarget(env, hostname, slug);
    if (target.fromOrigin) {
      ctx.waitUntil(target.backfill());
    }

    // No domain record means the origin lookup failed too; serving links from an
    // unverified or suspended hostname would let a takedown be bypassed by stalling
    // the panel, so the absent case is treated the same as the suspended one.
    if (!target.domain || target.domain.status === "suspended") {
      return notFound(env, null);
    }

    if (slug === "") {
      return notFound(env, target.domain.rootDestination);
    }

    if (target.biopage && isBiopageLive(target.biopage)) {
      const bioGate = await handlePasswordGate(request, env, {
        id: target.biopage.id,
        passwordHash: target.biopage.passwordHash ?? null,
        title: target.biopage.handle,
      });
      if (bioGate) {
        return bioGate;
      }
      const response = await proxyBiopage(env, request, target.biopage.handle);
      const ua = parseUserAgent(request.headers.get("user-agent"));
      const language = parseAcceptLanguage(request.headers.get("accept-language"));
      const trackCtx: TrackContext = {
        request,
        cf: request.cf,
        ua,
        language,
        hostname,
        slug,
        url,
      };
      ctx.waitUntil(
        buildEvent(env, trackCtx, {
          type: "bio_view",
          link: null,
          workspaceId: target.domain.workspaceId,
          biopageId: target.biopage.id,
          resolution: { destination: url.toString(), source: "default", ruleId: null, variantId: null },
        }).then((event) => enqueue(env, event)),
      );
      return response;
    }

    const link = target.link;
    if (!link || link.disabled) {
      return notFound(env, target.domain.notFoundDestination);
    }

    const gate = await handlePasswordGate(request, env, link);
    if (gate) {
      return gate;
    }

    const ua = parseUserAgent(request.headers.get("user-agent"));
    const language = parseAcceptLanguage(request.headers.get("accept-language"));
    const referrer = request.headers.get("referer") ?? "";
    const visitor = buildVisitorContext(request.cf, ua, language, referrer);

    let resolution = resolveDestination(
      {
        defaultDestination: link.destination,
        rules: link.rules,
        abVariants: link.abVariants,
        abSeed: `${link.id}:${request.headers.get("cf-connecting-ip") ?? ""}`,
        expiresAt: link.expiresAt,
        expiredDestination: link.expiredDestination,
      },
      visitor,
    );

    resolution = applyDeepLink(link, resolution, ua.os);

    const inbound = new URLSearchParams(url.search);
    const qrCodeId = inbound.get("qr");
    inbound.delete("qr");

    let destination = applyUtm(resolution.destination, link.utm, inbound);
    if (link.forwardQuery) {
      destination = forwardQuery(destination, inbound);
    }

    // The panel validates the scheme on write, but the worker trusts whatever is in KV,
    // and a cloaked link puts this value straight into an iframe src. Re-checking here
    // means one bad write cannot turn into script execution on a customer's domain.
    if (!isSafeDestination(destination)) {
      return notFound(env, target.domain.notFoundDestination);
    }

    const eventType: EventType = qrCodeId ? "qr_scan" : "click";
    const trackCtx: TrackContext = { request, cf: request.cf, ua, language, hostname, slug, url };
    if (!link.overQuota) {
      ctx.waitUntil(
        buildEvent(env, trackCtx, {
          type: eventType,
          link,
          qrId: qrCodeId ?? "",
          resolution: { ...resolution, destination },
        }).then((event) => enqueue(env, event)),
      );
    }

    if (link.cloaked) {
      return new Response(
        cloakHtml({
          destination,
          title: link.title,
          description: link.description,
          image: link.image,
          noIndex: link.noIndex,
        }),
        {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store, max-age=0",
            "x-robots-tag": "noindex, nofollow",
          },
        },
      );
    }

    return redirect(destination, true);
  },
} satisfies ExportedHandler<EdgeEnv>;

import {
  applyUtm,
  forwardQuery,
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

const ROBOTS_BODY = "User-agent: *\nDisallow: /\n";

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

function gateChallenge(link: LinkKvRecord, error: boolean, status = 401): Response {
  return new Response(passwordGateHtml({ title: link.title ?? "Protected link", error }), {
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
  link: LinkKvRecord,
): Promise<Response | null> {
  if (!link.passwordHash) {
    return null;
  }

  const cookieName = gateCookieName(link.id);
  const presented = readCookie(request.headers.get("cookie"), cookieName);

  if (await verifyGateCookie(presented, link.id, link.passwordHash, env.VISITOR_SALT)) {
    return null;
  }

  if (request.method === "POST") {
    const ip = request.headers.get("cf-connecting-ip") ?? "";
    if (await gateAttemptsExceeded(env, link.id, ip)) {
      return gateChallenge(link, true, 429);
    }

    let submitted = "";
    try {
      const form = await request.formData();
      submitted = String(form.get("password") ?? "");
    } catch {
      // A non-form body is a malformed submission, not a reason to 500 the worker.
      return gateChallenge(link, true);
    }

    if (await verifyGatePassword(submitted, link.passwordHash)) {
      const expiresAt = Date.now() + GATE_TTL_MS;
      const value = await gateCookieValue(link.id, link.passwordHash, env.VISITOR_SALT, expiresAt);

      return new Response(null, {
        status: 303,
        headers: {
          location: request.url,
          "set-cookie": `${cookieName}=${value}; Path=/; Max-Age=${GATE_TTL_MS / 1000}; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }

    return gateChallenge(link, true);
  }

  return gateChallenge(link, false);
}

/** Biopages are rendered by the Next.js app; the worker only proxies and tracks the view. */
async function proxyBiopage(env: EdgeEnv, request: Request, handle: string): Promise<Response> {
  // The panel serves biopages from its own `/{handle}` route with ISR, so the worker
  // proxies straight to it instead of duplicating the renderer at the edge.
  const target = new URL(`/${encodeURIComponent(handle)}`, env.ORIGIN_URL);
  const upstream = await fetch(target.toString(), {
    headers: {
      "accept-language": request.headers.get("accept-language") ?? "",
      "user-agent": request.headers.get("user-agent") ?? "",
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

    if (pathname === "/robots.txt") {
      return new Response(ROBOTS_BODY, {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    // The route pattern can cover the panel's own hostname; serving it as a slug would
    // black-hole the app and let the passthrough below recurse into this worker.
    if (hostname === new URL(env.ORIGIN_URL).hostname) {
      return fetch(request);
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

    if (target.biopage?.published) {
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
    ctx.waitUntil(
      buildEvent(env, trackCtx, {
        type: eventType,
        link,
        qrId: qrCodeId ?? "",
        resolution: { ...resolution, destination },
      }).then((event) => enqueue(env, event)),
    );

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
            ...(link.noIndex ? { "x-robots-tag": "noindex, nofollow" } : {}),
          },
        },
      );
    }

    return redirect(destination, link.noIndex);
  },
} satisfies ExportedHandler<EdgeEnv>;

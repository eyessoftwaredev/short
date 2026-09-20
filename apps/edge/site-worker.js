const SITE = new Set(["/", "/pricing", "/terms", "/privacy", "/cookies", "/sitemap.xml"]);
const PROXY = ["content-type", "content-language", "etag", "last-modified", "vary", "link"];
const PASS = [
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
];

function first(path) {
  return `/${path.split("/").filter(Boolean)[0] || ""}`;
}

function isSite(path) {
  return path === "/" || SITE.has(first(path)) || path.startsWith("/_next/") || path.startsWith("/api/brand");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    const path = url.pathname;
    const origin = env.ORIGIN_URL;
    const apex = new URL(origin).hostname.toLowerCase().replace(/^app\./, "");
    if (host === `www.${apex}`) {
      const next = new URL(url.toString());
      next.hostname = apex;
      next.protocol = "https:";
      return new Response(null, {
        status: 301,
        headers: { location: next.toString(), "cache-control": "public, max-age=86400" },
      });
    }
    if (!(host === apex && isSite(path))) {
      return new Response("Not found", { status: 404 });
    }
    const target = new URL(path + url.search, origin);
    const method = request.method;
    const hasBody = method !== "GET" && method !== "HEAD";
    try {
      const fwd = {
        accept: request.headers.get("accept") ?? "text/html",
        "x-short-surface": "site",
        "x-forwarded-host": host,
        "x-forwarded-proto": "https",
      };
      const clientIp = request.headers.get("cf-connecting-ip");
      if (clientIp) {
        fwd["x-forwarded-for"] = clientIp;
      }
      for (const name of PASS) {
        const value = request.headers.get(name);
        if (value) {
          fwd[name] = value;
        }
      }
      const upstream = await fetch(target.toString(), {
        method,
        headers: fwd,
        body: hasBody ? request.body : undefined,
        redirect: "manual",
        ...(hasBody ? { duplex: "half" } : {}),
      });
      const headers = new Headers();
      for (const name of PROXY) {
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
      return new Response("Bad gateway", { status: 502 });
    }
  },
};

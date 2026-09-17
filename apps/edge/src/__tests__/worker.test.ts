import { hashGatePassword, KV_SCHEMA_VERSION } from "@short/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../index";
import {
  biopageRecord,
  domainRecord,
  edgeRequest,
  fakeCtx,
  fakeKv,
  fakeQueue,
  keys,
  linkRecord,
  makeEnv,
} from "./harness";

function setup(seed: Record<string, unknown>) {
  const kv = fakeKv(seed);
  const queue = fakeQueue();
  const ctx = fakeCtx();
  return { kv, queue, ctx, env: makeEnv(kv, queue) };
}

const domainSeed = { [keys.domainKey("go.test")]: domainRecord() };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("redirect", () => {
  it("302s to the destination and never allows caching", async () => {
    const { env, ctx, queue } = setup({
      ...domainSeed,
      [keys.linkKey("go.test", "promo")]: linkRecord(),
    });

    const response = await worker.fetch(edgeRequest("https://go.test/promo"), env, ctx);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://example.com/landing");
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");

    await ctx.settled();
    expect(queue.sent).toHaveLength(1);
    expect(queue.sent[0]?.type).toBe("click");
    expect(queue.sent[0]?.country).toBe("TR");
    expect(queue.sent[0]?.ip).toBe("203.0.113.10");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("applies the highest-priority matching geo rule", async () => {
    const { env, ctx, queue } = setup({
      ...domainSeed,
      [keys.linkKey("go.test", "promo")]: linkRecord({
        rules: [
          {
            id: "rule_de",
            priority: 1,
            destination: "https://example.com/de",
            conditions: [{ type: "country", op: "in", values: ["DE"] }],
          },
          {
            id: "rule_tr",
            priority: 2,
            destination: "https://example.com/tr",
            conditions: [{ type: "country", op: "in", values: ["TR"] }],
          },
        ],
      }),
    });

    const response = await worker.fetch(edgeRequest("https://go.test/promo"), env, ctx);

    expect(response.headers.get("location")).toBe("https://example.com/tr");
    await ctx.settled();
    expect(queue.sent[0]?.ruleId).toBe("rule_tr");
    expect(queue.sent[0]?.resolutionSource).toBe("rule");
  });

  it("prefers the iOS destination only when no rule claimed the visit", async () => {
    const { env, ctx } = setup({
      ...domainSeed,
      [keys.linkKey("go.test", "promo")]: linkRecord({
        iosDestination: "https://apps.apple.com/app/id1",
      }),
    });

    const response = await worker.fetch(
      edgeRequest("https://go.test/promo", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
        },
      }),
      env,
      ctx,
    );

    expect(response.headers.get("location")).toBe("https://apps.apple.com/app/id1");
  });

  it("merges UTM parameters and forwards the inbound query when asked", async () => {
    const { env, ctx } = setup({
      ...domainSeed,
      [keys.linkKey("go.test", "promo")]: linkRecord({
        utm: { utm_source: "newsletter", utm_campaign: "spring" },
        forwardQuery: true,
      }),
    });

    const response = await worker.fetch(
      edgeRequest("https://go.test/promo?ref=abc&utm_source=twitter"),
      env,
      ctx,
    );
    const location = new URL(response.headers.get("location") ?? "");

    // Inbound UTM wins over the stored one; the stored campaign still comes through.
    expect(location.searchParams.get("utm_source")).toBe("twitter");
    expect(location.searchParams.get("utm_campaign")).toBe("spring");
    expect(location.searchParams.get("ref")).toBe("abc");
  });

  it("tracks a QR scan and strips the marker from the destination", async () => {
    const { env, ctx, queue } = setup({
      ...domainSeed,
      [keys.linkKey("go.test", "promo")]: linkRecord({ forwardQuery: true }),
    });

    const response = await worker.fetch(edgeRequest("https://go.test/promo?qr=qr_9"), env, ctx);

    expect(response.headers.get("location")).not.toContain("qr=");
    await ctx.settled();
    expect(queue.sent[0]?.type).toBe("qr_scan");
    expect(queue.sent[0]?.qrId).toBe("qr_9");
  });

  it("sends an expired link to its expiry destination", async () => {
    const { env, ctx } = setup({
      ...domainSeed,
      [keys.linkKey("go.test", "promo")]: linkRecord({
        expiresAt: Date.now() - 60_000,
        expiredDestination: "https://example.com/expired",
      }),
    });

    const response = await worker.fetch(edgeRequest("https://go.test/promo"), env, ctx);
    expect(response.headers.get("location")).toBe("https://example.com/expired");
  });

  it("serves a cloaked link as HTML instead of a redirect", async () => {
    const { env, ctx } = setup({
      ...domainSeed,
      [keys.linkKey("go.test", "promo")]: linkRecord({ cloaked: true, noIndex: true }),
    });

    const response = await worker.fetch(edgeRequest("https://go.test/promo"), env, ctx);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(await response.text()).toContain("https://example.com/landing");
  });
});

describe("not found handling", () => {
  it("uses the domain's not-found destination for an unknown slug", async () => {
    const kv = fakeKv(domainSeed);
    const queue = fakeQueue();
    const ctx = fakeCtx();
    const env = makeEnv(kv, queue);
    kv.store.set(
      keys.domainKey("go.test"),
      JSON.stringify(domainRecord({ notFoundDestination: "https://example.com/gone" })),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ link: null, domain: null, biopage: null })),
    );

    const response = await worker.fetch(edgeRequest("https://go.test/nope"), env, ctx);
    expect(response.headers.get("location")).toBe("https://example.com/gone");
  });

  it("treats a disabled link as missing", async () => {
    const { env, ctx, queue } = setup({
      ...domainSeed,
      [keys.linkKey("go.test", "promo")]: linkRecord({ disabled: true }),
    });

    const response = await worker.fetch(edgeRequest("https://go.test/promo"), env, ctx);

    expect(response.headers.get("location")).toBe("https://short.test/404");
    await ctx.settled();
    expect(queue.sent).toHaveLength(0);
  });

  it("stops every redirect on a suspended domain", async () => {
    const { env, ctx } = setup({
      [keys.domainKey("go.test")]: domainRecord({ status: "suspended" }),
      [keys.linkKey("go.test", "promo")]: linkRecord(),
    });

    const response = await worker.fetch(edgeRequest("https://go.test/promo"), env, ctx);
    expect(response.headers.get("location")).toBe("https://short.test/404");
  });
});

describe("password gate", () => {
  it("asks for the password, then sets a cookie on the correct one", async () => {
    const passwordHash = await hashGatePassword("open-sesame");
    const { env, ctx } = setup({
      ...domainSeed,
      [keys.linkKey("go.test", "promo")]: linkRecord({ passwordHash }),
    });

    const challenge = await worker.fetch(edgeRequest("https://go.test/promo"), env, ctx);
    expect(challenge.status).toBe(401);
    expect(challenge.headers.get("content-type")).toContain("text/html");

    const wrong = await worker.fetch(
      edgeRequest("https://go.test/promo", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "password=nope",
      }),
      env,
      ctx,
    );
    expect(wrong.status).toBe(401);

    const accepted = await worker.fetch(
      edgeRequest("https://go.test/promo", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "password=open-sesame",
      }),
      env,
      ctx,
    );

    expect(accepted.status).toBe(303);
    const cookie = accepted.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("HttpOnly");

    const withCookie = await worker.fetch(
      edgeRequest("https://go.test/promo", {
        headers: { cookie: cookie.split(";")[0] ?? "" },
      }),
      env,
      ctx,
    );
    expect(withCookie.status).toBe(302);
    expect(withCookie.headers.get("location")).toBe("https://example.com/landing");
  });
});

describe("origin fallback", () => {
  it("resolves from the panel on a KV miss and backfills both records", async () => {
    const kv = fakeKv({});
    const queue = fakeQueue();
    const ctx = fakeCtx();
    const env = makeEnv(kv, queue);

    const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) =>
      Response.json({
        link: linkRecord(),
        domain: domainRecord(),
        biopage: null,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(edgeRequest("https://go.test/promo"), env, ctx);
    expect(response.headers.get("location")).toBe("https://example.com/landing");

    const [url, init = {}] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://app.test/api/internal/resolve");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer internal-token");

    await ctx.settled();
    expect(kv.puts).toContain(keys.domainKey("go.test"));
    expect(kv.puts).toContain(keys.linkKey("go.test", "promo"));
  });

  it("falls back to the default 404 when the panel is unreachable", async () => {
    const { env, ctx } = setup({});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("origin down");
      }),
    );

    const response = await worker.fetch(edgeRequest("https://go.test/promo"), env, ctx);
    expect(response.headers.get("location")).toBe("https://short.test/404");
  });
});

describe("biopages", () => {
  it("proxies a published handle to the panel and records a view", async () => {
    const { env, ctx, queue } = setup({
      ...domainSeed,
      [keys.biopageKey("go.test", "acme")]: biopageRecord(),
    });

    const fetchMock = vi.fn(
      async () => new Response("<html>bio</html>", { headers: { "content-type": "text/html" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(edgeRequest("https://go.test/acme"), env, ctx);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("bio");
    const [url, init = {}] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/acme");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-forwarded-host"]).toBe("go.test");

    await ctx.settled();
    expect(queue.sent[0]?.type).toBe("bio_view");
    expect(queue.sent[0]?.biopageId).toBe("bio_1");
    expect(queue.sent[0]?.ip).toBe("203.0.113.10");
  });

  it("still proxies a bio when the link key is a cached miss", async () => {
    const { env, ctx } = setup({
      ...domainSeed,
      [keys.linkKey("go.test", "acme")]: { v: KV_SCHEMA_VERSION, miss: true },
      [keys.biopageKey("go.test", "acme")]: biopageRecord(),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>bio</html>", { headers: { "content-type": "text/html" } })),
    );

    const response = await worker.fetch(edgeRequest("https://go.test/acme"), env, ctx);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("bio");
  });
});

describe("apex site vs panel", () => {
  it("proxies / on the platform apex to origin with site surface headers", async () => {
    const { env, ctx } = setup({});
    const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) =>
      new Response("<html>landing</html>", { headers: { "content-type": "text/html" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(edgeRequest("https://test/"), env, ctx);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("landing");
    const [url, init = {}] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://app.test/");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-short-surface"]).toBe("site");
    expect(headers["x-forwarded-host"]).toBe("test");
  });

  it("302s /login to the panel origin", async () => {
    const { env, ctx } = setup({});
    const response = await worker.fetch(edgeRequest("https://test/login"), env, ctx);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://app.test/login");
  });

  it("proxies /pricing on the apex instead of resolving a slug", async () => {
    const { env, ctx, queue } = setup({
      ...domainSeed,
      [keys.linkKey("test", "pricing")]: linkRecord({ hostname: "test", slug: "pricing" }),
    });
    const fetchMock = vi.fn(
      async () => new Response("<html>pricing</html>", { headers: { "content-type": "text/html" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(edgeRequest("https://test/pricing"), env, ctx);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("pricing");
    expect(fetchMock).toHaveBeenCalled();
    await ctx.settled();
    expect(queue.sent).toHaveLength(0);
  });

  it("proxies /_next assets on the apex instead of bouncing them to the panel", async () => {
    const { env, ctx } = setup({});
    const fetchMock = vi.fn(
      async () => new Response("/* css */", { headers: { "content-type": "text/css" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(edgeRequest("https://test/_next/static/chunk.css"), env, ctx);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("css");
    const [url] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://app.test/_next/static/chunk.css");
  });

  it("301s www to the apex", async () => {
    const { env, ctx } = setup({});
    const response = await worker.fetch(edgeRequest("https://www.test/pricing"), env, ctx);

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://test/pricing");
  });

  it("still treats / on a customer hostname as a missing slug", async () => {
    const { env, ctx } = setup(domainSeed);
    const response = await worker.fetch(edgeRequest("https://go.test/"), env, ctx);
    expect(response.headers.get("location")).toBe("https://short.test/404");
  });
});

describe("protocol details", () => {
  it("serves an allow-all robots.txt on public hosts", async () => {
    const { env, ctx } = setup(domainSeed);
    const response = await worker.fetch(edgeRequest("https://go.test/robots.txt"), env, ctx);
    expect(await response.text()).toContain("Allow: /");
  });

  it("rejects verbs it cannot answer", async () => {
    const { env, ctx } = setup(domainSeed);
    const response = await worker.fetch(
      edgeRequest("https://go.test/promo", { method: "DELETE" }),
      env,
      ctx,
    );
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD, POST");
  });
});

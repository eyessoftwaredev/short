import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../index";
import { passwordGateHtml, previewHtml } from "../html";
import {
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
  vi.unstubAllGlobals();
});

describe("click limit", () => {
  it("treats a link that reached its limit as missing when it has no expiry destination", async () => {
    const { env, ctx, queue } = setup({
      ...domainSeed,
      [keys.linkKey("go.test", "promo")]: linkRecord({ limitReached: true }),
    });

    const response = await worker.fetch(edgeRequest("https://go.test/promo"), env, ctx);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://short.test/404");
    await ctx.settled();
    expect(queue.sent).toHaveLength(0);
  });

  it("sends a link that reached its limit to the expiry destination", async () => {
    const { env, ctx, queue } = setup({
      ...domainSeed,
      [keys.linkKey("go.test", "promo")]: linkRecord({
        limitReached: true,
        expiredDestination: "https://example.com/sold-out",
      }),
    });

    const response = await worker.fetch(edgeRequest("https://go.test/promo"), env, ctx);

    expect(response.headers.get("location")).toBe("https://example.com/sold-out");
    await ctx.settled();
    expect(queue.sent[0]?.resolutionSource).toBe("expired");
  });

  it("keeps redirecting while the flag is false or absent", async () => {
    for (const limitReached of [false, undefined]) {
      const { env, ctx } = setup({
        ...domainSeed,
        [keys.linkKey("go.test", "promo")]: linkRecord({ limitReached }),
      });
      const response = await worker.fetch(edgeRequest("https://go.test/promo"), env, ctx);
      expect(response.headers.get("location")).toBe("https://example.com/landing");
    }
  });
});

describe("link preview", () => {
  it("shows the destination instead of redirecting, and tracks nothing", async () => {
    const { env, ctx, queue } = setup({
      ...domainSeed,
      [keys.linkKey("go.test", "promo")]: linkRecord({
        title: "Spring sale",
        utm: { utm_source: "preview" },
      }),
    });

    const response = await worker.fetch(edgeRequest("https://go.test/promo+"), env, ctx);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    const csp = response.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("default-src 'none'");
    expect(csp).not.toContain("script-src");
    expect(html).not.toContain("<script");
    expect(html).toContain('<h1 class="host">example.com</h1>');
    expect(html).toContain("https://example.com/landing?utm_source=preview");
    expect(html).toContain("Spring sale");
    expect(html).toContain('href="https://go.test/promo"');
    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');

    await ctx.settled();
    expect(queue.sent).toHaveLength(0);
  });

  it("accepts an encoded + and answers in Turkish when asked", async () => {
    const { env, ctx } = setup({
      ...domainSeed,
      [keys.linkKey("go.test", "promo")]: linkRecord(),
    });

    const response = await worker.fetch(
      edgeRequest("https://go.test/promo%2B", { headers: { "accept-language": "tr-TR,tr;q=0.9,en;q=0.8" } }),
      env,
      ctx,
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('<html lang="tr">');
    expect(html).toContain("Siteye devam et");
  });

  it("escapes everything the link owner controls", async () => {
    const { env, ctx } = setup({
      ...domainSeed,
      [keys.linkKey("go.test", "promo")]: linkRecord({
        title: '<img src=x onerror="alert(1)">',
        destination: 'https://example.com/"><script>alert(1)</script>',
      }),
    });

    const html = await (await worker.fetch(edgeRequest("https://go.test/promo+"), env, ctx)).text();

    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("never reveals a protected link's destination", async () => {
    const { env, ctx } = setup({
      ...domainSeed,
      [keys.linkKey("go.test", "promo")]: linkRecord({ passwordHash: "hash", title: "Secret title" }),
    });

    const response = await worker.fetch(edgeRequest("https://go.test/promo+"), env, ctx);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("Protected link");
    expect(html).not.toContain("example.com");
    expect(html).not.toContain("Secret title");
  });

  it("shows the same unavailable page for scheduled, expired, limited, disabled and missing links", async () => {
    const now = Date.now();
    const variants = [
      linkRecord({ startsAt: now + 3_600_000 }),
      linkRecord({ expiresAt: now - 1000, expiredDestination: "https://example.com/expired" }),
      linkRecord({ limitReached: true }),
      linkRecord({ disabled: true }),
    ];
    const pages: string[] = [];

    for (const record of variants) {
      const { env, ctx, queue } = setup({ ...domainSeed, [keys.linkKey("go.test", "promo")]: record });
      const response = await worker.fetch(edgeRequest("https://go.test/promo+"), env, ctx);
      const html = await response.text();
      expect(response.status).toBe(404);
      expect(html).toContain("Link unavailable");
      expect(html).not.toContain("example.com");
      await ctx.settled();
      expect(queue.sent).toHaveLength(0);
      pages.push(html);
    }

    // A slug nobody owns: the origin says so, and the page looks exactly the same.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ link: null, domain: domainRecord(), biopage: null })),
    );
    const { env, ctx } = setup(domainSeed);
    const missing = await worker.fetch(edgeRequest("https://go.test/promo+"), env, ctx);
    expect(missing.status).toBe(404);
    const missingHtml = await missing.text();
    expect(new Set([...pages, missingHtml]).size).toBe(1);
  });

  it("refuses POST and leaves double + to normal resolution", async () => {
    const { env, ctx } = setup({
      ...domainSeed,
      [keys.linkKey("go.test", "promo")]: linkRecord(),
    });

    const post = await worker.fetch(edgeRequest("https://go.test/promo+", { method: "POST" }), env, ctx);
    expect(post.status).toBe(405);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ link: null, domain: domainRecord(), biopage: null })),
    );
    const doubled = await worker.fetch(edgeRequest("https://go.test/promo++"), env, ctx);
    expect(doubled.status).toBe(302);
    expect(doubled.headers.get("location")).toBe("https://short.test/404");
  });
});

describe("interstitial markup", () => {
  it("keeps the gate in English by default and localises it for Turkish", () => {
    expect(passwordGateHtml({ title: "t", error: true })).toContain("Incorrect password. Try again.");
    const tr = passwordGateHtml({ title: "<b>", error: true, language: "tr" });
    expect(tr).toContain("Parola yanlış");
    expect(tr).toContain("<title>&lt;b&gt;</title>");
  });

  it("shares the panel palette in light and dark", () => {
    const html = previewHtml({
      language: "en",
      shortLabel: "go.test/promo",
      shortUrl: "https://go.test/promo",
      state: "unavailable",
    });
    expect(html).toContain("--page: #f5f6f8");
    expect(html).toContain("--card: #1c1f26");
    expect(html).toContain("border-radius: 12px");
  });

  it("sends the gate with a Turkish page to Turkish visitors", async () => {
    const { env, ctx } = setup({
      ...domainSeed,
      [keys.linkKey("go.test", "promo")]: linkRecord({ passwordHash: "hash" }),
    });
    const response = await worker.fetch(
      edgeRequest("https://go.test/promo", { headers: { "accept-language": "tr" } }),
      env,
      ctx,
    );
    expect(response.status).toBe(401);
    expect(await response.text()).toContain("Parola gerekli");
  });
});

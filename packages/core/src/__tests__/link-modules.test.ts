import { describe, expect, it } from "vitest";
import { KV_SCHEMA_VERSION, effectiveExpiresAt, isLinkExpired, type LinkKvRecord } from "../kv";
import {
  HEALTH_FAILURES_TO_BREAK,
  classifyHealthStatus,
  nextHealthState,
  type LinkHealthState,
} from "../link-health";
import { linkDestinationVaries, linkPreviewState } from "../link-preview";
import {
  MAX_CLICKS_LIMIT,
  QR_FRAMES,
  WEBHOOK_EVENTS,
  linkInputSchema,
  linkListQuerySchema,
  qrStyleSchema,
  slugSchema,
} from "../schemas";
import { PREVIEW_SUFFIX, SLUG_PATTERN, generateSlug, previewSlugOf } from "../slug";

const base = { domainId: "7f0c7c52-9f4c-4c8a-9a51-0d4b5e7e9c11", destination: "https://acme.com" };

function link(overrides: Partial<LinkKvRecord> = {}): LinkKvRecord {
  return {
    v: KV_SCHEMA_VERSION,
    id: "lnk_1",
    workspaceId: "ws_1",
    hostname: "go.test",
    slug: "promo",
    destination: "https://example.com/landing",
    rules: [],
    abVariants: [],
    utm: null,
    expiresAt: null,
    expiredDestination: null,
    passwordHash: null,
    iosDestination: null,
    androidDestination: null,
    cloaked: false,
    noIndex: true,
    forwardQuery: false,
    disabled: false,
    title: null,
    description: null,
    image: null,
    ...overrides,
  };
}

describe("preview slugs", () => {
  it("strips exactly one trailing +", () => {
    expect(previewSlugOf("promo+")).toBe("promo");
    expect(previewSlugOf("a.b_c-d+")).toBe("a.b_c-d");
  });

  it("ignores anything that is not a single + after a valid slug", () => {
    expect(previewSlugOf("promo")).toBeNull();
    expect(previewSlugOf("+")).toBeNull();
    expect(previewSlugOf("promo++")).toBeNull();
    expect(previewSlugOf("-promo+")).toBeNull();
    expect(previewSlugOf("pro mo+")).toBeNull();
  });

  it("can never collide with a real slug", () => {
    expect(PREVIEW_SUFFIX).toBe("+");
    expect(SLUG_PATTERN.test("promo+")).toBe(false);
    expect(slugSchema.safeParse("promo+").success).toBe(false);
    for (let i = 0; i < 200; i += 1) {
      expect(generateSlug(9)).not.toContain("+");
    }
  });
});

describe("click limit expiry", () => {
  const now = Date.parse("2026-10-01T12:00:00.000Z");

  it("treats a reached limit as already expired", () => {
    expect(effectiveExpiresAt({ expiresAt: null, limitReached: true })).toBe(0);
    expect(isLinkExpired({ expiresAt: null, limitReached: true }, now)).toBe(true);
    expect(isLinkExpired({ expiresAt: now + 60_000, limitReached: true }, now)).toBe(true);
  });

  it("keeps the stored expiry otherwise, including records without the flag", () => {
    expect(effectiveExpiresAt({ expiresAt: now + 1 })).toBe(now + 1);
    expect(isLinkExpired({ expiresAt: now + 1, limitReached: false }, now)).toBe(false);
    expect(isLinkExpired({ expiresAt: now }, now)).toBe(true);
    expect(isLinkExpired({ expiresAt: null }, now)).toBe(false);
  });
});

describe("linkPreviewState", () => {
  const now = Date.parse("2026-10-01T12:00:00.000Z");

  it("shows a live link", () => {
    expect(linkPreviewState(link(), now)).toBe("available");
  });

  it("hides the destination of a protected link", () => {
    expect(linkPreviewState(link({ passwordHash: "abc" }), now)).toBe("protected");
  });

  it("reports every dead state the same way", () => {
    expect(linkPreviewState(null, now)).toBe("unavailable");
    expect(linkPreviewState(link({ disabled: true }), now)).toBe("unavailable");
    expect(linkPreviewState(link({ startsAt: now + 1000 }), now)).toBe("unavailable");
    expect(linkPreviewState(link({ expiresAt: now - 1 }), now)).toBe("unavailable");
    expect(
      linkPreviewState(link({ expiresAt: now - 1, expiredDestination: "https://x.test" }), now),
    ).toBe("unavailable");
    expect(linkPreviewState(link({ limitReached: true }), now)).toBe("unavailable");
    expect(linkPreviewState(link({ limitReached: true, passwordHash: "abc" }), now)).toBe(
      "unavailable",
    );
    expect(linkPreviewState(link({ destination: "javascript:alert(1)" }), now)).toBe("unavailable");
  });

  it("flags destinations that depend on the visitor", () => {
    expect(linkDestinationVaries(link())).toBe(false);
    expect(linkDestinationVaries(link({ iosDestination: "https://apps.apple.com/x" }))).toBe(true);
    expect(
      linkDestinationVaries(
        link({
          rules: [
            {
              id: "r1",
              priority: 1,
              destination: "https://example.com/de",
              conditions: [{ type: "country", op: "in", values: ["DE"] }],
            },
          ],
        }),
      ),
    ).toBe(true);
  });
});

describe("linkInputSchema.maxClicks", () => {
  it("is optional and nullable", () => {
    expect(linkInputSchema.parse(base).maxClicks).toBeUndefined();
    expect(linkInputSchema.parse({ ...base, maxClicks: null }).maxClicks).toBeNull();
    expect(linkInputSchema.parse({ ...base, maxClicks: 500 }).maxClicks).toBe(500);
  });

  it("rejects zero, fractions, strings and absurd caps", () => {
    for (const value of [0, -1, 1.5, "10", MAX_CLICKS_LIMIT + 1]) {
      expect(linkInputSchema.safeParse({ ...base, maxClicks: value }).success).toBe(false);
    }
  });

  it("adds broken and limited list filters", () => {
    expect(linkListQuerySchema.parse({ status: "broken" }).status).toBe("broken");
    expect(linkListQuerySchema.parse({ status: "limited" }).status).toBe("limited");
  });
});

describe("qrStyleSchema frames", () => {
  it("parses a style saved before frames existed as frame-less", () => {
    const legacy = qrStyleSchema.parse({ foreground: "#000000", background: "#ffffff", caption: "Hi" });
    expect(legacy.frame).toBe("none");
    expect(legacy.frameText).toBe("");
    expect(legacy.frameColor).toBeNull();
  });

  it("accepts every frame with a short label and hex color", () => {
    for (const frame of QR_FRAMES) {
      const style = qrStyleSchema.parse({ frame, frameText: "  Scan me  ", frameColor: "#0f766e" });
      expect(style.frame).toBe(frame);
      expect(style.frameText).toBe("Scan me");
    }
  });

  it("rejects long labels, unknown frames and non-hex colors", () => {
    expect(qrStyleSchema.safeParse({ frameText: "x".repeat(25) }).success).toBe(false);
    expect(qrStyleSchema.safeParse({ frame: "circle" }).success).toBe(false);
    expect(qrStyleSchema.safeParse({ frameColor: "red" }).success).toBe(false);
    expect(qrStyleSchema.safeParse({ frameColor: "#fff\"/><script>" }).success).toBe(false);
  });
});

describe("webhook events", () => {
  it("includes link.broken", () => {
    expect(WEBHOOK_EVENTS).toContain("link.broken");
  });
});

describe("link health", () => {
  const now = new Date("2026-10-01T12:00:00.000Z");
  const fresh: LinkHealthState = { status: "unknown", failures: 0, statusCode: null, brokenSince: null };

  it("classifies statuses", () => {
    for (const status of [200, 204, 301, 302, 308, 401, 403, 405, 429]) {
      expect(classifyHealthStatus(status)).toBe("ok");
    }
    for (const status of [404, 410, 500, 502, 503]) {
      expect(classifyHealthStatus(status)).toBe("broken");
    }
  });

  it("needs two consecutive failures before a link is broken", () => {
    const first = nextHealthState(fresh, { outcome: "broken", statusCode: 404, reason: "http_404" }, now);
    expect(first.status).toBe("unknown");
    expect(first.failures).toBe(1);
    expect(first.becameBroken).toBe(false);

    const second = nextHealthState(first, { outcome: "broken", statusCode: null, reason: "dns" }, now);
    expect(HEALTH_FAILURES_TO_BREAK).toBe(2);
    expect(second.status).toBe("broken");
    expect(second.brokenSince).toEqual(now);
    expect(second.becameBroken).toBe(true);

    const later = new Date(now.getTime() + 3_600_000);
    const third = nextHealthState(second, { outcome: "broken", statusCode: 500, reason: "http_500" }, later);
    expect(third.becameBroken).toBe(false);
    expect(third.brokenSince).toEqual(now);
  });

  it("recovers on the first success and resets the strike count", () => {
    const broken: LinkHealthState = { status: "broken", failures: 3, statusCode: 500, brokenSince: now };
    const recovered = nextHealthState(broken, { outcome: "ok", statusCode: 200, reason: null }, now);
    expect(recovered).toMatchObject({ status: "ok", failures: 0, brokenSince: null, recovered: true });

    const blip = nextHealthState(
      { status: "ok", failures: 0, statusCode: 200, brokenSince: null },
      { outcome: "broken", statusCode: 503, reason: "http_503" },
      now,
    );
    const healed = nextHealthState(blip, { outcome: "ok", statusCode: 200, reason: null }, now);
    expect(healed.failures).toBe(0);
    expect(healed.recovered).toBe(false);
  });

  it("leaves the state alone when the probe was inconclusive", () => {
    const state: LinkHealthState = { status: "ok", failures: 1, statusCode: 200, brokenSince: null };
    const next = nextHealthState(state, { outcome: "inconclusive", statusCode: null, reason: "blocked" }, now);
    expect(next).toMatchObject(state);
    expect(next.becameBroken).toBe(false);
  });
});

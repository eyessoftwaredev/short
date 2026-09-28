import { describe, expect, it } from "vitest";
import {
  languageConditionSchema,
  matchesCondition,
  resolveDestination,
  targetRuleSchema,
  type Condition,
  type VisitorContext,
} from "../targeting";

function ctx(overrides: Partial<VisitorContext> = {}): VisitorContext {
  return {
    country: "TR",
    continent: "AS",
    region: "Istanbul",
    city: "Istanbul",
    device: "desktop",
    os: "windows",
    browser: "chrome",
    inApp: null,
    language: "tr",
    referrer: "",
    now: new Date("2026-09-14T12:00:00.000Z"),
    ...overrides,
  };
}

describe("matchesCondition", () => {
  it("matches country membership case-insensitively", () => {
    expect(matchesCondition({ type: "country", op: "in", values: ["tr", "de"] }, ctx())).toBe(true);
    expect(matchesCondition({ type: "country", op: "in", values: ["US"] }, ctx())).toBe(false);
  });

  it("inverts membership for not_in", () => {
    expect(matchesCondition({ type: "country", op: "not_in", values: ["US"] }, ctx())).toBe(true);
    expect(matchesCondition({ type: "country", op: "not_in", values: ["TR"] }, ctx())).toBe(false);
  });

  it("matches device type", () => {
    const condition = { type: "device", op: "in", values: ["mobile"] } satisfies Condition;
    expect(matchesCondition(condition, ctx({ device: "mobile" }))).toBe(true);
    expect(matchesCondition(condition, ctx({ device: "desktop" }))).toBe(false);
  });

  it("handles referrer operators", () => {
    expect(matchesCondition({ type: "referrer", op: "empty" }, ctx())).toBe(true);
    expect(
      matchesCondition(
        { type: "referrer", op: "contains", value: "google" },
        ctx({ referrer: "https://www.google.com/search?q=x" }),
      ),
    ).toBe(true);
    expect(
      matchesCondition(
        { type: "referrer", op: "equals", value: "www.google.com" },
        ctx({ referrer: "https://www.google.com/search?q=x" }),
      ),
    ).toBe(true);
  });

  it("evaluates schedules in the configured timezone", () => {
    // 12:00 UTC is 15:00 in Istanbul on a Monday.
    const condition = {
      type: "schedule",
      timezone: "Europe/Istanbul",
      from: "14:00",
      to: "18:00",
      days: [1],
    } satisfies Condition;
    expect(matchesCondition(condition, ctx())).toBe(true);
    expect(matchesCondition({ ...condition, days: [2] }, ctx())).toBe(false);
    expect(matchesCondition({ ...condition, from: "16:00", to: "18:00" }, ctx())).toBe(false);
  });

  it("supports schedule windows that wrap past midnight", () => {
    const condition = {
      type: "schedule",
      timezone: "UTC",
      from: "22:00",
      to: "06:00",
      days: [0, 1, 2, 3, 4, 5, 6],
    } satisfies Condition;
    expect(matchesCondition(condition, ctx({ now: new Date("2026-09-14T23:30:00Z") }))).toBe(true);
    expect(matchesCondition(condition, ctx({ now: new Date("2026-09-14T03:30:00Z") }))).toBe(true);
    expect(matchesCondition(condition, ctx({ now: new Date("2026-09-14T12:00:00Z") }))).toBe(false);
  });

  it("does not throw on an invalid timezone", () => {
    expect(
      matchesCondition(
        { type: "schedule", timezone: "Not/AZone", from: "00:00", to: "23:59", days: [1] },
        ctx(),
      ),
    ).toBe(false);
  });
});

describe("client conditions", () => {
  it("matches operating systems", () => {
    const condition = { type: "os", op: "in", values: ["windows", "macos", "linux"] } satisfies Condition;
    expect(matchesCondition(condition, ctx({ os: "macos" }))).toBe(true);
    expect(matchesCondition(condition, ctx({ os: "linux" }))).toBe(true);
    expect(matchesCondition(condition, ctx({ os: "ios" }))).toBe(false);
    expect(matchesCondition({ ...condition, op: "not_in" }, ctx({ os: "chromeos" }))).toBe(true);
  });

  it("matches a browser by engine or by in-app webview", () => {
    const chrome = { type: "browser", op: "in", values: ["chrome"] } satisfies Condition;
    const instagram = { type: "browser", op: "in", values: ["instagram"] } satisfies Condition;
    const androidInstagram = ctx({ os: "android", browser: "chrome", inApp: "instagram" });
    const iosInstagram = ctx({ os: "ios", browser: "other", inApp: "instagram" });

    expect(matchesCondition(chrome, androidInstagram)).toBe(true);
    expect(matchesCondition(instagram, androidInstagram)).toBe(true);
    expect(matchesCondition(instagram, iosInstagram)).toBe(true);
    expect(matchesCondition(chrome, iosInstagram)).toBe(false);
    expect(matchesCondition(instagram, ctx())).toBe(false);
    expect(matchesCondition({ ...instagram, op: "not_in" }, iosInstagram)).toBe(false);
    expect(matchesCondition({ ...instagram, op: "not_in" }, ctx())).toBe(true);
    expect(
      matchesCondition({ type: "browser", op: "in", values: ["samsung"] }, ctx({ browser: "samsung" })),
    ).toBe(true);
  });

  it("matches the visitor language by primary subtag", () => {
    const condition = { type: "language", op: "in", values: ["tr", "de"] } satisfies Condition;
    expect(matchesCondition(condition, ctx({ language: "tr" }))).toBe(true);
    expect(matchesCondition(condition, ctx({ language: "en" }))).toBe(false);
    // Legacy values stored with a region still match.
    expect(matchesCondition({ ...condition, values: ["en-US"] }, ctx({ language: "en" }))).toBe(true);
    // No Accept-Language never matches "in", always matches "not_in".
    expect(matchesCondition(condition, ctx({ language: "" }))).toBe(false);
    expect(matchesCondition({ ...condition, op: "not_in" }, ctx({ language: "" }))).toBe(true);
  });

  it("normalises language values on write", () => {
    const parsed = languageConditionSchema.parse({ type: "language", op: "in", values: ["TR", "en-GB", "pt_BR"] });
    expect(parsed.values).toEqual(["tr", "en", "pt"]);
    expect(languageConditionSchema.safeParse({ type: "language", op: "in", values: ["english"] }).success).toBe(false);
    expect(languageConditionSchema.safeParse({ type: "language", op: "in", values: [] }).success).toBe(false);
  });

  it("parses a language rule through the full rule schema", () => {
    const rule = targetRuleSchema.parse({
      id: "r1",
      priority: 1,
      destination: "https://acme.com/de",
      conditions: [{ type: "language", op: "in", values: ["DE"] }],
    });
    expect(rule.conditions[0]).toEqual({ type: "language", op: "in", values: ["de"] });
    const resolved = resolveDestination({ defaultDestination: "https://acme.com", rules: [rule] }, ctx({ language: "de" }));
    expect(resolved.ruleId).toBe("r1");
  });
});

describe("resolveDestination", () => {
  const base = "https://acme.com/global";

  it("falls back to the default destination", () => {
    const result = resolveDestination({ defaultDestination: base }, ctx());
    expect(result).toMatchObject({ destination: base, source: "default" });
  });

  it("picks the lowest-priority matching rule", () => {
    const result = resolveDestination(
      {
        defaultDestination: base,
        rules: [
          {
            id: "b",
            priority: 10,
            conditions: [{ type: "country", op: "in", values: ["TR"] }],
            destination: "https://acme.com/tr-late",
          },
          {
            id: "a",
            priority: 1,
            conditions: [{ type: "country", op: "in", values: ["TR"] }],
            destination: "https://acme.com/tr",
          },
        ],
      },
      ctx(),
    );
    expect(result).toMatchObject({ destination: "https://acme.com/tr", source: "rule", ruleId: "a" });
  });

  it("requires every condition in a rule to match", () => {
    const result = resolveDestination(
      {
        defaultDestination: base,
        rules: [
          {
            id: "a",
            priority: 1,
            conditions: [
              { type: "country", op: "in", values: ["TR"] },
              { type: "device", op: "in", values: ["mobile"] },
            ],
            destination: "https://acme.com/tr-mobile",
          },
        ],
      },
      ctx({ device: "desktop" }),
    );
    expect(result.source).toBe("default");
  });

  it("routes expired links to the expiry destination", () => {
    const result = resolveDestination(
      {
        defaultDestination: base,
        expiresAt: new Date("2026-01-01T00:00:00Z").getTime(),
        expiredDestination: "https://acme.com/gone",
      },
      ctx(),
    );
    expect(result).toMatchObject({ destination: "https://acme.com/gone", source: "expired" });
  });

  it("keeps the same visitor in the same A/B bucket", () => {
    const input = {
      defaultDestination: base,
      abVariants: [
        { id: "a", destination: "https://acme.com/a", weight: 50 },
        { id: "b", destination: "https://acme.com/b", weight: 50 },
      ],
      abSeed: "visitor-42",
    };
    const first = resolveDestination(input, ctx());
    const second = resolveDestination(input, ctx({ now: new Date("2026-10-01T00:00:00Z") }));
    expect(first.source).toBe("ab");
    expect(first.variantId).toBe(second.variantId);
  });

  it("respects A/B weights across many seeds", () => {
    let aCount = 0;
    for (let i = 0; i < 2000; i += 1) {
      const result = resolveDestination(
        {
          defaultDestination: base,
          abVariants: [
            { id: "a", destination: "https://acme.com/a", weight: 80 },
            { id: "b", destination: "https://acme.com/b", weight: 20 },
          ],
          abSeed: `visitor-${i}`,
        },
        ctx(),
      );
      if (result.variantId === "a") {
        aCount += 1;
      }
    }
    expect(aCount / 2000).toBeGreaterThan(0.75);
    expect(aCount / 2000).toBeLessThan(0.85);
  });
});

import { describe, expect, it } from "vitest";
import {
  matchesCondition,
  resolveDestination,
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

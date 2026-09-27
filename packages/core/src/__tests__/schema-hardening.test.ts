import { describe, expect, it } from "vitest";
import { linkInputSchema, webhookInputSchema } from "../schemas";
import { abVariantSchema, scheduleConditionSchema, targetRuleSchema } from "../targeting";
import { isPublicHttpUrl, normalizeDestination } from "../url";
import { parseUserAgent } from "../ua";

const DANGEROUS = [
  "javascript:alert(document.domain)",
  "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
  "vbscript:msgbox(1)",
  "file:///etc/passwd",
  "blob:https://acme.com/x",
];

const condition = { type: "country", op: "in", values: ["TR"] } as const;

/**
 * Zod's `url()` accepts every one of these, so a plain `z.string().url()` on any field
 * that reaches a Location header or a cloak iframe is a stored-XSS hole.
 */
describe("destination scheme allowlist", () => {
  it.each(DANGEROUS)("rejects %s in a targeting rule", (destination) => {
    const result = targetRuleSchema.safeParse({
      id: "r1",
      priority: 0,
      conditions: [condition],
      destination,
    });
    expect(result.success).toBe(false);
  });

  it.each(DANGEROUS)("rejects %s in an A/B variant", (destination) => {
    const result = abVariantSchema.safeParse({ id: "v1", destination, weight: 50 });
    expect(result.success).toBe(false);
  });

  it("still accepts a normal rule destination and normalises a bare host", () => {
    const result = targetRuleSchema.safeParse({
      id: "r1",
      priority: 0,
      conditions: [condition],
      destination: "acme.com/tr",
    });
    expect(result.success).toBe(true);
    expect(result.data?.destination).toBe("https://acme.com/tr");
  });

  it("rejects a dangerous scheme on the link's preview image", () => {
    const base = {
      domainId: "11111111-1111-4111-8111-111111111111",
      destination: "https://acme.com",
    };
    expect(linkInputSchema.safeParse({ ...base, image: "javascript:alert(1)" }).success).toBe(false);
    expect(linkInputSchema.safeParse({ ...base, image: "https://acme.com/og.png" }).success).toBe(false);
    expect(
      linkInputSchema.safeParse({
        ...base,
        image: "/api/media/11111111-1111-4111-8111-111111111111",
      }).success,
    ).toBe(true);
  });

  it("rejects a rule destination through the full link input", () => {
    const result = linkInputSchema.safeParse({
      domainId: "11111111-1111-4111-8111-111111111111",
      destination: "https://acme.com",
      cloaked: true,
      rules: [{ id: "r1", priority: 0, conditions: [condition], destination: "javascript:alert(1)" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("normalizeDestination", () => {
  it("strips control characters that would break the Location header", () => {
    // `new URL()` tolerates these, `new Headers()` does not — the edge would 500.
    expect(normalizeDestination("https://acme.com/a\r\nSet-Cookie: q=1")).toBe(
      "https://acme.com/aSet-Cookie: q=1",
    );
    expect(normalizeDestination("https://acme.com/\u0000x")).toBe("https://acme.com/x");
  });
});

describe("parseUserAgent", () => {
  it("truncates before running the browser patterns", () => {
    // Several patterns backtrack quadratically; this input costs ~500ms unbounded.
    const hostile = "Version/1.".repeat(8000);
    const started = Date.now();
    const parsed = parseUserAgent(hostile);
    expect(Date.now() - started).toBeLessThan(50);
    expect(parsed.device).toBe("desktop");
  });
});

describe("webhook URL SSRF guard", () => {
  it.each([
    "http://localhost:8123/",
    "http://127.0.0.1/",
    "http://2130706433/",
    "http://0x7f000001/",
    "http://10.0.0.5/hook",
    "http://172.20.1.1/",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://100.64.0.1/",
    "http://0.0.0.0/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[fd00::1]/",
    "http://[fe80::1]/",
    "http://clickhouse:8123/",
    "http://postgres.internal/",
    "http://printer.local/",
    "https://user:pass@hooks.acme.com/",
    "ftp://hooks.acme.com/",
    "javascript:alert(1)",
  ])("rejects %s", (url) => {
    expect(isPublicHttpUrl(url)).toBe(false);
    expect(webhookInputSchema.safeParse({ url, events: ["link.created"] }).success).toBe(false);
  });

  it.each(["https://hooks.acme.com/short", "http://93.184.216.34:8080/hook", "https://[2001:db8::1]/"])(
    "accepts %s",
    (url) => {
      expect(isPublicHttpUrl(url)).toBe(true);
      expect(webhookInputSchema.safeParse({ url, events: ["link.created"] }).success).toBe(true);
    },
  );
});

describe("targeting schema limits", () => {
  const schedule = { type: "schedule", from: "09:00", to: "17:00", days: [1, 2, 3] } as const;

  it("rejects an unknown time zone instead of storing a rule that never matches", () => {
    expect(scheduleConditionSchema.safeParse({ ...schedule, timezone: "Europe/Istanbul" }).success).toBe(true);
    expect(scheduleConditionSchema.safeParse({ ...schedule, timezone: "Mars/Olympus" }).success).toBe(false);
  });

  it("caps rule and variant ids", () => {
    const long = "x".repeat(65);
    expect(
      targetRuleSchema.safeParse({ id: long, priority: 0, conditions: [condition], destination: "https://a.co" })
        .success,
    ).toBe(false);
    expect(abVariantSchema.safeParse({ id: long, destination: "https://a.co", weight: 50 }).success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { linkInputSchema } from "../schemas";
import { abVariantSchema, targetRuleSchema } from "../targeting";
import { normalizeDestination } from "../url";
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

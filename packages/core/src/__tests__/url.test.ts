import { describe, expect, it } from "vitest";
import { generateSlug, slugify, validateSlug } from "../slug";
import {
  applyUtm,
  forwardQuery,
  isSafeDestination,
  normalizeDestination,
  rewriteHostname,
} from "../url";

describe("isSafeDestination", () => {
  it("accepts http and https", () => {
    expect(isSafeDestination("https://acme.com/a")).toBe(true);
    expect(isSafeDestination("http://acme.com")).toBe(true);
  });

  it("rejects script and data URLs", () => {
    expect(isSafeDestination("javascript:alert(1)")).toBe(false);
    expect(isSafeDestination("data:text/html,<script>")).toBe(false);
    expect(isSafeDestination("acme.com")).toBe(false);
  });
});

describe("normalizeDestination", () => {
  it("adds https to a bare host", () => {
    expect(normalizeDestination("acme.com/x")).toBe("https://acme.com/x");
  });

  it("leaves an explicit scheme alone", () => {
    expect(normalizeDestination("http://acme.com")).toBe("http://acme.com");
  });
});

describe("applyUtm", () => {
  it("writes stored params", () => {
    const out = applyUtm("https://acme.com/p", { utm_source: "newsletter" });
    expect(new URL(out).searchParams.get("utm_source")).toBe("newsletter");
  });

  it("lets inbound params override stored ones", () => {
    const out = applyUtm(
      "https://acme.com/p",
      { utm_source: "stored" },
      new URLSearchParams("utm_source=inbound"),
    );
    expect(new URL(out).searchParams.get("utm_source")).toBe("inbound");
  });
});

describe("forwardQuery", () => {
  it("appends unknown params but never overwrites the destination's own", () => {
    const out = forwardQuery("https://acme.com/p?keep=1", new URLSearchParams("keep=2&extra=3"));
    const params = new URL(out).searchParams;
    expect(params.get("keep")).toBe("1");
    expect(params.get("extra")).toBe("3");
  });

  it("skips utm keys so applyUtm stays authoritative", () => {
    const out = forwardQuery("https://acme.com/p", new URLSearchParams("utm_source=x"));
    expect(new URL(out).searchParams.has("utm_source")).toBe(false);
  });
});

describe("rewriteHostname", () => {
  it("swaps an exact host and keeps path, query and hash", () => {
    expect(rewriteHostname("https://old.example.com/a?x=1#top", "old.example.com", "new.example.com")).toBe(
      "https://new.example.com/a?x=1#top",
    );
  });

  it("treats www as the same host", () => {
    expect(rewriteHostname("https://www.old.example.com/p", "old.example.com", "new.example.com")).toBe(
      "https://new.example.com/p",
    );
    expect(rewriteHostname("https://old.example.com/p", "www.old.example.com", "new.example.com")).toBe(
      "https://new.example.com/p",
    );
  });

  it("is case-insensitive", () => {
    expect(rewriteHostname("https://Old.Example.com/p", "OLD.example.com", "New.Example.com")).toBe(
      "https://new.example.com/p",
    );
  });

  it("leaves a different host unchanged", () => {
    expect(rewriteHostname("https://other.example.com/p", "old.example.com", "new.example.com")).toBe(
      "https://other.example.com/p",
    );
  });

  it("does not rewrite a hostname that only appears in the query", () => {
    expect(
      rewriteHostname("https://keep.example.com/?ref=old.example.com", "old.example.com", "new.example.com"),
    ).toBe("https://keep.example.com/?ref=old.example.com");
  });

  it("keeps http", () => {
    expect(rewriteHostname("http://old.example.com/p", "old.example.com", "new.example.com")).toBe(
      "http://new.example.com/p",
    );
  });

  it("returns null for an invalid URL", () => {
    expect(rewriteHostname("not a url", "old.example.com", "new.example.com")).toBeNull();
  });

  it("returns null when the hostnames are not valid", () => {
    expect(rewriteHostname("https://old.example.com/p", "nope", "new.example.com")).toBeNull();
  });
});

describe("slug helpers", () => {
  it("rejects reserved and malformed slugs", () => {
    expect(validateSlug("admin")).toEqual({ ok: false, reason: "reserved" });
    expect(validateSlug("-bad")).toEqual({ ok: false, reason: "format" });
    expect(validateSlug("my-Link_1.x")).toEqual({ ok: true });
  });

  it("generates slugs of the requested length from the safe alphabet", () => {
    const slug = generateSlug(9);
    expect(slug).toHaveLength(9);
    expect(slug).not.toMatch(/[0OlI1]/);
  });

  it("folds Turkish characters when slugifying", () => {
    expect(slugify("Çağrı Şen — Güncel İçerik")).toBe("cagri-sen-guncel-icerik");
  });
});

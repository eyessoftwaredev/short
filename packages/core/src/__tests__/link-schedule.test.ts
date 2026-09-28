import { describe, expect, it } from "vitest";
import { isBeforeLinkStart } from "../kv";
import { linkInputSchema, linkListQuerySchema } from "../schemas";

const base = { domainId: "7f0c7c52-9f4c-4c8a-9a51-0d4b5e7e9c11", destination: "https://acme.com" };

describe("isBeforeLinkStart", () => {
  const now = Date.parse("2026-10-01T12:00:00.000Z");

  it("is true only strictly before the start", () => {
    expect(isBeforeLinkStart({ startsAt: now + 1 }, now)).toBe(true);
    expect(isBeforeLinkStart({ startsAt: now }, now)).toBe(false);
    expect(isBeforeLinkStart({ startsAt: now - 1 }, now)).toBe(false);
  });

  it("treats missing and null as live", () => {
    expect(isBeforeLinkStart({}, now)).toBe(false);
    expect(isBeforeLinkStart({ startsAt: null }, now)).toBe(false);
  });
});

describe("linkInputSchema.startsAt", () => {
  const inAnHour = new Date(Date.now() + 3_600_000);
  const inADay = new Date(Date.now() + 86_400_000);

  it("is optional, nullable and coerced", () => {
    expect(linkInputSchema.parse(base).startsAt).toBeUndefined();
    expect(linkInputSchema.parse({ ...base, startsAt: null }).startsAt).toBeNull();
    expect(linkInputSchema.parse({ ...base, startsAt: inAnHour.toISOString() }).startsAt).toEqual(inAnHour);
  });

  it("may lie in the past so a started link stays editable", () => {
    expect(linkInputSchema.safeParse({ ...base, startsAt: "2020-01-01T00:00:00Z" }).success).toBe(true);
  });

  it("must come before the expiry", () => {
    expect(linkInputSchema.safeParse({ ...base, startsAt: inAnHour, expiresAt: inADay }).success).toBe(true);
    const inverted = linkInputSchema.safeParse({ ...base, startsAt: inADay, expiresAt: inAnHour });
    expect(inverted.success).toBe(false);
    expect(inverted.error?.issues[0]?.path).toEqual(["startsAt"]);
    expect(linkInputSchema.safeParse({ ...base, startsAt: inADay, expiresAt: inADay }).success).toBe(false);
  });

  it("adds a scheduled list filter", () => {
    expect(linkListQuerySchema.parse({ status: "scheduled" }).status).toBe("scheduled");
  });
});

import { describe, expect, it } from "vitest";
import { isBiopageLive, isHexColor, sanitizeBioCss } from "../bio-chrome";
import { parseStoredBioBlock, biopageInputSchema } from "../schemas/biopage";

describe("sanitizeBioCss", () => {
  it("keeps allowlisted declarations", () => {
    expect(sanitizeBioCss("color: #111; padding: 8px")).toBe("color: #111; padding: 8px");
  });

  it("drops selectors, imports and script-capable values", () => {
    expect(sanitizeBioCss("@import url(https://evil); color: red")).toBe("");
    expect(sanitizeBioCss("background-image: url(javascript:alert(1))")).toBe("");
    expect(sanitizeBioCss("a { color: red }")).toBe("");
  });

  it("keeps allowlisted display and linear-gradient, drops the rest", () => {
    expect(sanitizeBioCss("display: flex; gap: 8px")).toBe("display: flex; gap: 8px");
    expect(sanitizeBioCss("display: table")).toBe("");
    expect(
      sanitizeBioCss("background-image: linear-gradient(90deg, #000, #fff)"),
    ).toBe("background-image: linear-gradient(90deg, #000, #fff)");
    expect(sanitizeBioCss("background-image: url(https://cdn.example/bg.png)")).toBe("");
  });
});

describe("isBiopageLive", () => {
  const now = Date.parse("2026-06-01T12:00:00.000Z");

  it("requires published and honors the window", () => {
    expect(isBiopageLive({ published: false }, now)).toBe(false);
    expect(isBiopageLive({ published: true }, now)).toBe(true);
    expect(
      isBiopageLive({ published: true, publishAt: "2026-07-01T00:00:00.000Z" }, now),
    ).toBe(false);
    expect(
      isBiopageLive({ published: true, unpublishAt: "2026-05-01T00:00:00.000Z" }, now),
    ).toBe(false);
    expect(
      isBiopageLive(
        {
          published: true,
          publishAt: "2026-05-01T00:00:00.000Z",
          unpublishAt: "2026-07-01T00:00:00.000Z",
        },
        now,
      ),
    ).toBe(true);
  });
});

describe("isHexColor", () => {
  it("accepts 3 and 6 digit hex only", () => {
    expect(isHexColor("#fff")).toBe(true);
    expect(isHexColor("#00e5ff")).toBe(true);
    expect(isHexColor("red")).toBe(false);
  });
});

describe("legacy biopage JSON", () => {
  it("parses a stored link block without iconName or newTab", () => {
    const parsed = parseStoredBioBlock({
      id: "11111111-1111-4111-8111-111111111111",
      position: 0,
      visible: true,
      type: "link",
      label: "Shop",
      destination: "https://acme.com",
      iconUrl: null,
      highlighted: false,
    });
    expect(parsed?.type).toBe("link");
    if (parsed?.type === "link") {
      expect(parsed.iconName).toBeNull();
      expect(parsed.newTab).toBe(true);
    }
  });

  it("fills chrome defaults when a page payload omits them", () => {
    const parsed = biopageInputSchema.safeParse({
      handle: "acme",
      displayName: "Acme",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.bgType).toBe("theme");
      expect(parsed.data.fontFamily).toBe("sans");
      expect(parsed.data.profileMode).toBe("photo");
      expect(parsed.data.customCss).toBe("");
      expect(parsed.data.blocks).toEqual([]);
    }
  });

  it("parses a stored form block without optional fields", () => {
    const parsed = parseStoredBioBlock({
      id: "22222222-2222-4222-8222-222222222222",
      position: 1,
      visible: true,
      type: "form",
      mode: "email",
      title: "Join",
      buttonLabel: "Send",
    });
    expect(parsed?.type).toBe("form");
    if (parsed?.type === "form") {
      expect(parsed.whatsappNumber).toBeNull();
      expect(parsed.successMessage).toBe("");
    }
  });

  it("rejects a bad hex override and a selector-looking template id", () => {
    expect(
      biopageInputSchema.safeParse({
        handle: "acme",
        displayName: "Acme",
        buttonColor: "red",
      }).success,
    ).toBe(false);
    expect(
      biopageInputSchema.safeParse({
        handle: "acme",
        displayName: "Acme",
        templateId: "custom-pack",
      }).success,
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { parseAcceptLanguage, parseUserAgent } from "../ua";

describe("parseUserAgent", () => {
  it("detects an iPhone running Safari", () => {
    const result = parseUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    );
    expect(result).toMatchObject({ device: "mobile", os: "ios", browser: "safari", isBot: false });
    expect(result.osVersion).toBe("17.5");
  });

  it("detects an Android phone running Chrome", () => {
    const result = parseUserAgent(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
    );
    expect(result).toMatchObject({ device: "mobile", os: "android", browser: "chrome" });
  });

  it("treats Android without the Mobile token as a tablet", () => {
    const result = parseUserAgent(
      "Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    );
    expect(result.device).toBe("tablet");
  });

  it("detects an iPad", () => {
    expect(
      parseUserAgent(
        "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/604.1",
      ),
    ).toMatchObject({ device: "tablet", os: "ios" });
  });

  it("prefers Edge over the Chrome token it contains", () => {
    expect(
      parseUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
      ),
    ).toMatchObject({ device: "desktop", os: "windows", browser: "edge" });
  });

  it("flags crawlers", () => {
    expect(parseUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1)").isBot).toBe(true);
    expect(parseUserAgent("curl/8.4.0").isBot).toBe(true);
  });

  it("treats a missing user agent as a bot", () => {
    expect(parseUserAgent("").isBot).toBe(true);
    expect(parseUserAgent(null).isBot).toBe(true);
  });
});

describe("parseAcceptLanguage", () => {
  it("returns the primary subtag", () => {
    expect(parseAcceptLanguage("tr-TR,tr;q=0.9,en-US;q=0.8")).toBe("tr");
    expect(parseAcceptLanguage("en-GB")).toBe("en");
    expect(parseAcceptLanguage(null)).toBe("");
  });
});

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

describe("operating systems and browsers", () => {
  it.each([
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0",
      { os: "windows", browser: "firefox", device: "desktop" },
    ],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
      { os: "macos", browser: "safari", device: "desktop" },
    ],
    [
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      { os: "linux", browser: "chrome", device: "desktop" },
    ],
    [
      "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      { os: "chromeos", browser: "chrome" },
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 OPR/112.0.0.0",
      { os: "windows", browser: "opera" },
    ],
    [
      "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
      { os: "android", browser: "samsung", device: "mobile" },
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1",
      { os: "ios", browser: "chrome" },
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/126.0.2592.56 Version/17.0 Mobile/15E148 Safari/604.1",
      { os: "ios", browser: "edge" },
    ],
    [
      "Mozilla/5.0 (Android 14; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0",
      { os: "android", browser: "firefox", device: "mobile" },
    ],
  ])("classifies %s", (ua, expected) => {
    expect(parseUserAgent(ua)).toMatchObject({ ...expected, inApp: null });
  });
});

describe("in-app browsers", () => {
  it.each([
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 339.0.3.12.91 (iPhone15,2; iOS 17_5; en_US; en; scale=3.00; 1179x2556; 619461904)",
      "instagram",
    ],
    [
      "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240705.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.134 Mobile Safari/537.36 Instagram 339.0.0.36.106 Android (34/14; 420dpi; 1080x2205; Google; Pixel 8; shiba; shiba; en_US; 619461904)",
      "instagram",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/473.0.0.35.108;FBBV/613063044;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBCR/;FBID/phone;FBLC/en_US;FBOP/80]",
      "facebook",
    ],
    [
      "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240705.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.134 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/473.0.0.46.108;]",
      "facebook",
    ],
    [
      "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240705.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.134 Mobile Safari/537.36 [FB_IAB/Orca-Android;FBAV/465.0.0.39.109;]",
      "messenger",
    ],
    [
      "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240705.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.134 Mobile Safari/537.36 musical_ly_2023508030 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/35.8.3 ByteLocale/en ByteFullLocale/en Region/US",
      "tiktok",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/13.3.0.44 (like Safari/8618.2.12.10.9, panda)",
      "snapchat",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.29.8126",
      "linkedin",
    ],
    [
      "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240705.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.134 Mobile Safari/537.36 TwitterAndroid",
      "twitter",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.10.0",
      "line",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49(0x18003137) NetType/WIFI Language/zh_CN",
      "wechat",
    ],
  ])("detects %s", (ua, expected) => {
    expect(parseUserAgent(ua).inApp).toBe(expected);
  });

  it("keeps the engine for analytics while flagging the app", () => {
    const result = parseUserAgent(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240705.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.134 Mobile Safari/537.36 Instagram 339.0.0.36.106 Android",
    );
    expect(result).toMatchObject({ os: "android", browser: "chrome", inApp: "instagram" });
  });

  it("does not mistake Linux desktops for LINE", () => {
    expect(
      parseUserAgent(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      ).inApp,
    ).toBeNull();
  });
});

describe("parseAcceptLanguage", () => {
  it("returns the primary subtag", () => {
    expect(parseAcceptLanguage("tr-TR,tr;q=0.9,en-US;q=0.8")).toBe("tr");
    expect(parseAcceptLanguage("en-GB")).toBe("en");
    expect(parseAcceptLanguage(null)).toBe("");
  });

  it("picks the highest-weighted language, not the first listed", () => {
    expect(parseAcceptLanguage("en-US;q=0.5,de-DE;q=0.9,tr;q=0.7")).toBe("de");
    expect(parseAcceptLanguage("fr;q=0.8, es")).toBe("es");
  });

  it("breaks ties by list order", () => {
    expect(parseAcceptLanguage("de,en")).toBe("de");
    expect(parseAcceptLanguage("en;q=0.8,de;q=0.8")).toBe("en");
  });

  it("skips wildcards, q=0 entries and junk", () => {
    expect(parseAcceptLanguage("*,tr;q=0.5")).toBe("tr");
    expect(parseAcceptLanguage("en;q=0,tr;q=0.1")).toBe("tr");
    expect(parseAcceptLanguage("x-klingon,123,tr")).toBe("tr");
    expect(parseAcceptLanguage("*")).toBe("");
  });

  it("lowercases and accepts underscores", () => {
    expect(parseAcceptLanguage("PT_br")).toBe("pt");
  });

  it("stays linear on a hostile header", () => {
    const hostile = `${"a;".repeat(50_000)}tr`;
    const started = performance.now();
    parseAcceptLanguage(hostile);
    expect(performance.now() - started).toBeLessThan(50);
  });
});

import { describe, expect, it } from "vitest";
import { linkInputSchema } from "../schemas";
import {
  appLaunchUrl,
  browserEscapeUrl,
  isSafeLaunchUrl,
  normalizeOpenMode,
  planOpen,
} from "../open-mode";

const mobile = { os: "ios", inApp: null, isBot: false } as const;
const android = { os: "android", inApp: null, isBot: false } as const;

describe("normalizeOpenMode", () => {
  it("treats missing and unknown values as auto", () => {
    expect(normalizeOpenMode(undefined)).toBe("auto");
    expect(normalizeOpenMode("nope")).toBe("auto");
    expect(normalizeOpenMode("app")).toBe("app");
    expect(normalizeOpenMode("browser")).toBe("browser");
  });
});

describe("appLaunchUrl on iOS", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube://www.youtube.com/watch?v=dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=42", "youtube://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42"],
    ["https://www.instagram.com/nasa/", "instagram://user?username=nasa"],
    ["https://x.com/jack", "twitter://user?screen_name=jack"],
    ["https://twitter.com/jack/status/20", "twitter://status?id=20"],
    ["https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC", "spotify:track:4uLU6hMCjMI75M1A2tKUQC"],
    ["https://open.spotify.com/intl-tr/album/1DFixLWuPkv3KT3TnV35m3", "spotify:album:1DFixLWuPkv3KT3TnV35m3"],
    ["https://wa.me/905551112233?text=Merhaba%20d%C3%BCnya", "whatsapp://send?phone=905551112233&text=Merhaba%20d%C3%BCnya"],
    ["https://api.whatsapp.com/send?phone=905551112233", "whatsapp://send?phone=905551112233"],
    ["https://t.me/durov", "tg://resolve?domain=durov"],
    ["https://t.me/durov/42", "tg://resolve?domain=durov&post=42"],
    ["https://t.me/+AbCdEfGh1234", "tg://join?invite=AbCdEfGh1234"],
    ["https://www.pinterest.com/pin/123456789/", "pinterest://pin/123456789"],
  ])("maps %s", (destination, expected) => {
    expect(appLaunchUrl(destination, "ios")?.url).toBe(expected);
  });

  it.each([
    "https://www.instagram.com/p/C8abcdEFG/",
    "https://www.tiktok.com/@user/video/123",
    "https://www.facebook.com/zuck",
    "https://www.linkedin.com/in/someone",
    "https://x.com/explore",
    "https://t.me/share/url?url=x",
    "https://example.com/",
    "https://evil.com/?u=https://youtube.com/watch?v=x",
    "https://youtube.com.evil.com/watch?v=x",
  ])("does not guess a scheme for %s", (destination) => {
    expect(appLaunchUrl(destination, "ios")).toBeNull();
  });
});

describe("appLaunchUrl on Android", () => {
  it("pins the https URL to the app's package with a browser fallback", () => {
    const launch = appLaunchUrl("https://www.instagram.com/p/C8abcdEFG/?igsh=1#frag", "android");
    expect(launch?.app).toBe("instagram");
    expect(launch?.url).toBe(
      `intent://www.instagram.com/p/C8abcdEFG/?igsh=1#Intent;scheme=https;package=com.instagram.android;S.browser_fallback_url=${encodeURIComponent(
        "https://www.instagram.com/p/C8abcdEFG/?igsh=1#frag",
      )};end`,
    );
  });

  it.each([
    ["https://www.tiktok.com/@user/video/123", "com.zhiliaoapp.musically"],
    ["https://www.facebook.com/zuck", "com.facebook.katana"],
    ["https://www.linkedin.com/in/someone", "com.linkedin.android"],
    ["https://youtu.be/dQw4w9WgXcQ", "com.google.android.youtube"],
    ["https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC", "com.spotify.music"],
    ["https://t.me/durov", "org.telegram.messenger"],
    ["https://wa.me/905551112233", "com.whatsapp"],
    ["https://tr.pinterest.com/pin/1/", "com.pinterest"],
  ])("maps %s to %s", (destination, pkg) => {
    expect(appLaunchUrl(destination, "android")?.url).toContain(`;package=${pkg};`);
  });

  it("ignores unknown hosts and desktops", () => {
    expect(appLaunchUrl("https://example.com/", "android")).toBeNull();
    expect(appLaunchUrl("https://www.youtube.com/watch?v=x", "windows")).toBeNull();
  });
});

describe("browserEscapeUrl", () => {
  it("builds an Android VIEW intent without a package", () => {
    expect(browserEscapeUrl("https://shop.acme.com/p/1?a=b", "android")).toBe(
      `intent://shop.acme.com/p/1?a=b#Intent;scheme=https;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(
        "https://shop.acme.com/p/1?a=b",
      )};end`,
    );
  });

  it("uses x-safari on iOS", () => {
    expect(browserEscapeUrl("https://shop.acme.com/p/1", "ios")).toBe("x-safari-https://shop.acme.com/p/1");
    expect(browserEscapeUrl("http://shop.acme.com/", "ios")).toBe("x-safari-http://shop.acme.com/");
  });

  it("refuses non-web destinations and other platforms", () => {
    expect(browserEscapeUrl("javascript:alert(1)", "ios")).toBeNull();
    expect(browserEscapeUrl("data:text/html,x", "android")).toBeNull();
    expect(browserEscapeUrl("https://acme.com", "windows")).toBeNull();
  });
});

describe("isSafeLaunchUrl", () => {
  it("only allows the schemes this module builds", () => {
    expect(isSafeLaunchUrl("intent://acme.com/#Intent;scheme=https;end")).toBe(true);
    expect(isSafeLaunchUrl("youtube://www.youtube.com/watch?v=x")).toBe(true);
    expect(isSafeLaunchUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeLaunchUrl("JavaScript:alert(1)")).toBe(false);
    expect(isSafeLaunchUrl("data:text/html,<script>")).toBe(false);
    expect(isSafeLaunchUrl("vbscript:x")).toBe(false);
    expect(isSafeLaunchUrl("https://acme.com")).toBe(false);
    expect(isSafeLaunchUrl("youtube://x\"><script>")).toBe(false);
    expect(isSafeLaunchUrl("tg://resolve?domain=a b")).toBe(false);
  });
});

describe("planOpen", () => {
  it("keeps auto links on the plain redirect", () => {
    expect(planOpen("auto", "https://youtu.be/dQw4w9WgXcQ", mobile)).toEqual({ kind: "redirect" });
  });

  it("opens known apps on phones only", () => {
    expect(planOpen("app", "https://youtu.be/dQw4w9WgXcQ", mobile)).toMatchObject({
      kind: "app",
      app: "youtube",
    });
    expect(planOpen("app", "https://youtu.be/dQw4w9WgXcQ", android)).toMatchObject({ kind: "launch" });
    expect(
      planOpen("app", "https://youtu.be/dQw4w9WgXcQ", { os: "macos", inApp: null, isBot: false }),
    ).toEqual({ kind: "redirect" });
    expect(planOpen("app", "https://example.com", mobile)).toEqual({ kind: "redirect" });
  });

  it("redirects Android browsers straight to the package-pinned intent", () => {
    expect(planOpen("app", "https://www.instagram.com/berkcanturks/", android)).toEqual({
      kind: "launch",
      app: "instagram",
      launchUrl: `intent://www.instagram.com/berkcanturks/#Intent;scheme=https;package=com.instagram.android;S.browser_fallback_url=${encodeURIComponent(
        "https://www.instagram.com/berkcanturks/",
      )};end`,
    });
  });

  it("gives iOS Safari a tap-to-open universal link with no scripted fallback", () => {
    // A scripted custom-scheme jump only raises a dialog that an automatic web
    // fallback used to dismiss; the https button opens the app without one.
    expect(planOpen("app", "https://www.instagram.com/berkcanturks/", mobile)).toEqual({
      kind: "app",
      app: "instagram",
      appName: "Instagram",
      buttonUrl: "https://www.instagram.com/berkcanturks/",
      autoUrl: null,
      webFallback: false,
    });
    // Apps without a documented iOS scheme are reachable the same way.
    expect(planOpen("app", "https://www.tiktok.com/@acme/video/1", mobile)).toMatchObject({
      kind: "app",
      appName: "TikTok",
      autoUrl: null,
    });
  });

  it("tries the custom scheme, then the web page, inside in-app browsers", () => {
    expect(
      planOpen("app", "https://www.instagram.com/berkcanturks/", { os: "ios", inApp: "facebook", isBot: false }),
    ).toEqual({
      kind: "app",
      app: "instagram",
      appName: "Instagram",
      buttonUrl: "instagram://user?username=berkcanturks",
      autoUrl: "instagram://user?username=berkcanturks",
      webFallback: true,
    });
    expect(
      planOpen("app", "https://www.tiktok.com/@acme/video/1", { os: "ios", inApp: "facebook", isBot: false }),
    ).toEqual({ kind: "redirect" });
    expect(
      planOpen("app", "https://youtu.be/dQw4w9WgXcQ", { os: "android", inApp: "instagram", isBot: false }),
    ).toMatchObject({ kind: "app", webFallback: true });
  });

  it("only escapes when the visit is inside an in-app browser", () => {
    expect(planOpen("browser", "https://acme.com", mobile)).toEqual({ kind: "redirect" });
    expect(
      planOpen("browser", "https://acme.com", { os: "ios", inApp: "instagram", isBot: false }),
    ).toEqual({ kind: "browser", inApp: "instagram", launchUrl: "x-safari-https://acme.com/" });
  });

  it("never serves the interstitial to bots", () => {
    expect(
      planOpen("browser", "https://acme.com", { os: "ios", inApp: "facebook", isBot: true }),
    ).toEqual({ kind: "redirect" });
    expect(planOpen("app", "https://youtu.be/dQw4w9WgXcQ", { ...mobile, isBot: true })).toEqual({
      kind: "redirect",
    });
  });
});

describe("linkInputSchema.openMode", () => {
  const base = { domainId: "7f0c7c52-9f4c-4c8a-9a51-0d4b5e7e9c11", destination: "https://acme.com" };

  it("is optional and validated", () => {
    expect(linkInputSchema.parse(base).openMode).toBeUndefined();
    expect(linkInputSchema.parse({ ...base, openMode: "app" }).openMode).toBe("app");
    expect(linkInputSchema.safeParse({ ...base, openMode: "native" }).success).toBe(false);
  });
});

import type { InAppName, ParsedUa } from "./ua";

/**
 * How the edge hands a visitor over to the destination.
 * - `auto`: a plain redirect (the behaviour every link had before this setting existed).
 * - `app`: on iOS/Android, try the destination's native app first (known apps only).
 * - `browser`: when the visit comes from a social app's webview, try to reopen the
 *   destination in the phone's real browser.
 */
export const LINK_OPEN_MODES = ["auto", "app", "browser"] as const;
export type LinkOpenMode = (typeof LINK_OPEN_MODES)[number];

/** KV records written before the setting existed carry no value; anything unknown is `auto`. */
export function normalizeOpenMode(value: unknown): LinkOpenMode {
  return value === "app" || value === "browser" ? value : "auto";
}

type AppSpec = {
  id: string;
  /** Matches the hostname with a leading `www.` removed. */
  hosts: (host: string) => boolean;
  /** Android package that owns the app links for these hosts. */
  androidPackage: string;
  /** iOS URL-scheme equivalent, or null when the app has no reliable scheme for it. */
  ios?: (url: URL) => string | null;
};

function oneOf(...hosts: string[]): (host: string) => boolean {
  const set = new Set(hosts);
  return (host) => set.has(host);
}

function pathSegments(url: URL): string[] {
  return url.pathname.split("/").filter((segment) => segment !== "");
}

const INSTAGRAM_RESERVED = new Set([
  "p", "reel", "reels", "tv", "explore", "stories", "accounts", "direct", "about", "legal",
  "developer", "web", "challenge", "emails", "session",
]);

const TWITTER_RESERVED = new Set([
  "home", "explore", "search", "i", "intent", "settings", "messages", "notifications",
  "hashtag", "share", "compose", "login", "logout", "signup", "tos", "privacy", "jobs",
]);

const TELEGRAM_RESERVED = new Set(["share", "addstickers", "addemoji", "proxy", "socks", "iv", "setlanguage", "login"]);

const SPOTIFY_TYPES = new Set(["track", "album", "artist", "playlist", "show", "episode"]);

/**
 * Well-known destinations the `app` mode can open natively. Android always goes through
 * an `intent://` for the same https URL pinned to the app's package: every app below
 * verifies its own domain for app links, so the path maps 1:1 and Chrome falls back to
 * `S.browser_fallback_url` when the app is missing. iOS needs a custom scheme, and only
 * the shapes with a documented, long-standing mapping are listed; everything else
 * returns null and the visitor gets a normal redirect (universal links still apply).
 */
const APPS: readonly AppSpec[] = [
  {
    id: "youtube",
    hosts: oneOf("youtube.com", "m.youtube.com", "youtu.be"),
    androidPackage: "com.google.android.youtube",
    ios: (url) => {
      const host = url.hostname.replace(/^www\./, "");
      if (host === "youtu.be") {
        const [id] = pathSegments(url);
        if (!id || !/^[\w-]{6,20}$/.test(id)) {
          return null;
        }
        const params = new URLSearchParams(url.search);
        params.delete("v");
        const rest = params.toString();
        return `youtube://www.youtube.com/watch?v=${id}${rest ? `&${rest}` : ""}`;
      }
      return `youtube://www.youtube.com${url.pathname}${url.search}`;
    },
  },
  {
    id: "instagram",
    hosts: oneOf("instagram.com"),
    androidPackage: "com.instagram.android",
    ios: (url) => {
      const segments = pathSegments(url);
      const [name] = segments;
      if (segments.length !== 1 || !name || INSTAGRAM_RESERVED.has(name.toLowerCase())) {
        return null;
      }
      return /^[A-Za-z0-9._]{1,30}$/.test(name) ? `instagram://user?username=${name}` : null;
    },
  },
  {
    id: "tiktok",
    hosts: oneOf("tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"),
    androidPackage: "com.zhiliaoapp.musically",
  },
  {
    id: "twitter",
    hosts: oneOf("twitter.com", "x.com", "mobile.twitter.com", "mobile.x.com"),
    androidPackage: "com.twitter.android",
    ios: (url) => {
      const segments = pathSegments(url);
      const [name, kind, id] = segments;
      if (!name || !/^[A-Za-z0-9_]{1,15}$/.test(name) || TWITTER_RESERVED.has(name.toLowerCase())) {
        return null;
      }
      if (segments.length === 1) {
        return `twitter://user?screen_name=${name}`;
      }
      if (kind === "status" && id && /^\d{1,25}$/.test(id)) {
        return `twitter://status?id=${id}`;
      }
      return null;
    },
  },
  {
    id: "facebook",
    hosts: oneOf("facebook.com", "m.facebook.com", "fb.com", "fb.watch"),
    androidPackage: "com.facebook.katana",
  },
  {
    id: "spotify",
    hosts: oneOf("open.spotify.com"),
    androidPackage: "com.spotify.music",
    ios: (url) => {
      const segments = pathSegments(url);
      // Localised links carry an `intl-xx` prefix.
      const [type, id] = segments[0]?.startsWith("intl-") ? segments.slice(1) : segments;
      if (!type || !id || !SPOTIFY_TYPES.has(type) || !/^[A-Za-z0-9]{10,40}$/.test(id)) {
        return null;
      }
      return `spotify:${type}:${id}`;
    },
  },
  {
    id: "linkedin",
    hosts: oneOf("linkedin.com"),
    androidPackage: "com.linkedin.android",
  },
  {
    id: "whatsapp",
    hosts: oneOf("wa.me", "api.whatsapp.com", "chat.whatsapp.com"),
    androidPackage: "com.whatsapp",
    ios: (url) => {
      const host = url.hostname.replace(/^www\./, "");
      const text = url.searchParams.get("text");
      const suffix = text ? `&text=${encodeURIComponent(text)}` : "";
      if (host === "wa.me") {
        const segments = pathSegments(url);
        const [phone] = segments;
        if (segments.length !== 1 || !phone || !/^\d{6,15}$/.test(phone)) {
          return null;
        }
        return `whatsapp://send?phone=${phone}${suffix}`;
      }
      if (host === "api.whatsapp.com" && url.pathname === "/send") {
        const phone = url.searchParams.get("phone") ?? "";
        return /^\d{6,15}$/.test(phone) ? `whatsapp://send?phone=${phone}${suffix}` : null;
      }
      return null;
    },
  },
  {
    id: "telegram",
    hosts: oneOf("t.me", "telegram.me"),
    androidPackage: "org.telegram.messenger",
    ios: (url) => {
      let segments = pathSegments(url);
      if (segments[0] === "s") {
        segments = segments.slice(1);
      }
      const [first, second] = segments;
      if (!first) {
        return null;
      }
      if (first === "joinchat" && second && /^[\w-]{8,64}$/.test(second)) {
        return `tg://join?invite=${second}`;
      }
      if (first.startsWith("+") && /^\+[\w-]{8,64}$/.test(first)) {
        return `tg://join?invite=${first.slice(1)}`;
      }
      if (!/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(first) || TELEGRAM_RESERVED.has(first.toLowerCase())) {
        return null;
      }
      if (segments.length === 1) {
        return `tg://resolve?domain=${first}`;
      }
      if (segments.length === 2 && second && /^\d{1,12}$/.test(second)) {
        return `tg://resolve?domain=${first}&post=${second}`;
      }
      return null;
    },
  },
  {
    id: "pinterest",
    hosts: (host) => host === "pinterest.com" || host === "pin.it" || /^[a-z]{2}\.pinterest\.com$/.test(host),
    androidPackage: "com.pinterest",
    ios: (url) => {
      const segments = pathSegments(url);
      const [first, second] = segments;
      if (url.hostname === "pin.it" || !first) {
        return null;
      }
      if (first === "pin" && second && /^\d{1,25}$/.test(second) && segments.length === 2) {
        return `pinterest://pin/${second}`;
      }
      if (segments.length === 1 && /^[A-Za-z0-9_]{3,30}$/.test(first) && first !== "pin") {
        return `pinterest://user/${first}`;
      }
      return null;
    },
  },
];

/** Every scheme a launch URL built here can start with. Anything else is never served. */
const LAUNCH_SCHEMES = new Set([
  "intent",
  "x-safari-https",
  "x-safari-http",
  "youtube",
  "instagram",
  "twitter",
  "spotify",
  "whatsapp",
  "tg",
  "pinterest",
]);

/**
 * Defence in depth for the interstitial: a launch URL must use one of the schemes above
 * and carry no whitespace or control characters, so no code path can ever put a
 * `javascript:` or `data:` target on the page.
 */
export function isSafeLaunchUrl(raw: string): boolean {
  // eslint-disable-next-line no-control-regex
  if (raw.length > 4096 || /[\s\u0000-\u001f\u007f<>"`\\]/.test(raw)) {
    return false;
  }
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(raw);
  return match !== null && LAUNCH_SCHEMES.has((match[1] ?? "").toLowerCase());
}

function parseWebUrl(destination: string): URL | null {
  try {
    const url = new URL(destination);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function findApp(url: URL): AppSpec | null {
  const host = url.hostname.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  return APPS.find((app) => app.hosts(host)) ?? null;
}

/** `intent://` form of an http(s) URL. The fragment is dropped: `#Intent` owns it. */
function androidIntent(url: URL, extras: string): string {
  const scheme = url.protocol.slice(0, -1);
  const fallback = encodeURIComponent(url.toString());
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=${scheme};${extras}S.browser_fallback_url=${fallback};end`;
}

export type AppLaunch = { app: string; url: string };

/** Native-app URL for a known destination on this OS, or null to redirect normally. */
export function appLaunchUrl(destination: string, os: ParsedUa["os"]): AppLaunch | null {
  if (os !== "ios" && os !== "android") {
    return null;
  }
  const url = parseWebUrl(destination);
  const app = url ? findApp(url) : null;
  if (!url || !app) {
    return null;
  }
  const launch =
    os === "android" ? androidIntent(url, `package=${app.androidPackage};`) : (app.ios?.(url) ?? null);
  return launch && isSafeLaunchUrl(launch) ? { app: app.id, url: launch } : null;
}

/** URL that asks the OS to reopen `destination` in the default browser, or null. */
export function browserEscapeUrl(destination: string, os: ParsedUa["os"]): string | null {
  const url = parseWebUrl(destination);
  if (!url) {
    return null;
  }
  let launch: string | null = null;
  if (os === "android") {
    launch = androidIntent(url, "action=android.intent.action.VIEW;");
  } else if (os === "ios") {
    // iOS 17+ opens `x-safari-https://…` in Safari; older versions ignore it, which is
    // why the interstitial also offers copy-link.
    launch = `x-safari-${url.toString()}`;
  }
  return launch && isSafeLaunchUrl(launch) ? launch : null;
}

export type OpenPlan =
  | { kind: "redirect" }
  | { kind: "app"; app: string; launchUrl: string }
  | { kind: "browser"; inApp: InAppName; launchUrl: string };

/**
 * Decides whether a visit gets the plain redirect or the app / browser interstitial.
 * Bots and link unfurlers always get the redirect so previews keep working.
 */
export function planOpen(
  mode: LinkOpenMode,
  destination: string,
  ua: Pick<ParsedUa, "os" | "inApp" | "isBot">,
): OpenPlan {
  if (mode === "auto" || ua.isBot) {
    return { kind: "redirect" };
  }
  if (mode === "app") {
    const launch = appLaunchUrl(destination, ua.os);
    return launch ? { kind: "app", app: launch.app, launchUrl: launch.url } : { kind: "redirect" };
  }
  if (ua.inApp === null) {
    return { kind: "redirect" };
  }
  const launchUrl = browserEscapeUrl(destination, ua.os);
  return launchUrl ? { kind: "browser", inApp: ua.inApp, launchUrl } : { kind: "redirect" };
}

/**
 * Dependency-free user-agent parsing. Runs identically in workerd and Node so the
 * edge worker and the panel preview classify a visitor the same way.
 */

export const DEVICE_TYPES = ["mobile", "tablet", "desktop"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export const OS_NAMES = [
  "ios",
  "android",
  "windows",
  "macos",
  "linux",
  "chromeos",
  "other",
] as const;
export type OsName = (typeof OS_NAMES)[number];

export const BROWSER_NAMES = [
  "chrome",
  "safari",
  "firefox",
  "edge",
  "opera",
  "samsung",
  "ie",
  "other",
] as const;
export type BrowserName = (typeof BROWSER_NAMES)[number];

/**
 * Social apps that open links in their own embedded webview. Tracked separately from
 * `browser` (an Instagram webview on Android still reports its Chrome engine) so
 * analytics keep the engine while targeting and the "open in browser" mode can key off
 * the app.
 */
export const IN_APP_NAMES = [
  "instagram",
  "facebook",
  "messenger",
  "tiktok",
  "snapchat",
  "linkedin",
  "twitter",
  "line",
  "wechat",
  "pinterest",
] as const;
export type InAppName = (typeof IN_APP_NAMES)[number];

export type ParsedUa = {
  device: DeviceType;
  os: OsName;
  osVersion: string;
  browser: BrowserName;
  browserVersion: string;
  /** The social app whose webview made the request, or null for a real browser. */
  inApp: InAppName | null;
  isBot: boolean;
};

const BOT_PATTERN =
  /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|embedly|quora link preview|showyoubot|outbrain|pinterest|vkshare|w3c_validator|whatsapp|telegrambot|discordbot|slackbot|twitterbot|linkedinbot|applebot|bingpreview|headlesschrome|lighthouse|preview|monitor|curl|wget|python-requests|axios|go-http-client|okhttp|postman/i;

/** Order matters: more specific tokens are tested before the generic ones they contain. */
const BROWSER_RULES: Array<{ name: BrowserName; re: RegExp }> = [
  { name: "edge", re: /Edg(?:e|A|iOS)?\/([\d.]+)/i },
  { name: "opera", re: /(?:OPR|Opera|OPiOS|\bOPT)\/([\d.]+)/i },
  { name: "samsung", re: /SamsungBrowser\/([\d.]+)/i },
  { name: "firefox", re: /(?:Firefox|FxiOS)\/([\d.]+)/i },
  { name: "chrome", re: /(?:Chrome|CriOS|Chromium)\/([\d.]+)/i },
  { name: "safari", re: /Version\/([\d.]+).*Safari/i },
  { name: "ie", re: /(?:MSIE |rv:)([\d.]+).*Trident/i },
];

const OS_RULES: Array<{ name: OsName; re: RegExp; normalize?: (raw: string) => string }> = [
  { name: "ios", re: /(?:iPhone |CPU )OS ([\d_]+)/i, normalize: (raw) => raw.replace(/_/g, ".") },
  { name: "ios", re: /iPad|iPhone|iPod/i },
  { name: "android", re: /Android ([\d.]+)/i },
  { name: "android", re: /Android/i },
  { name: "chromeos", re: /CrOS \w+ ([\d.]+)/i },
  { name: "windows", re: /Windows NT ([\d.]+)/i },
  { name: "macos", re: /Mac OS X ([\d_.]+)/i, normalize: (raw) => raw.replace(/_/g, ".") },
  { name: "macos", re: /Macintosh/i },
  { name: "linux", re: /Linux|X11|Ubuntu|Fedora/i },
];

/** Order matters: Messenger's UA also carries the generic Facebook tokens. */
const IN_APP_RULES: Array<{ name: InAppName; re: RegExp }> = [
  { name: "messenger", re: /FBAN\/Messenger|MessengerForiOS|MessengerLiteForiOS|FB_IAB\/(?:Orca|MESSENGER)/i },
  { name: "instagram", re: /\bInstagram\b/i },
  { name: "facebook", re: /FBAN\/|FBAV\/|FB_IAB\//i },
  { name: "tiktok", re: /musical_ly|BytedanceWebview|ByteLocale|\bTikTok\b|\btrill_\d/i },
  { name: "snapchat", re: /\bSnapchat\b/i },
  { name: "linkedin", re: /LinkedInApp/i },
  { name: "twitter", re: /TwitterAndroid|Twitter for (?:iPhone|iPad|Android)/i },
  // Case-sensitive on purpose: "line/" would also hit "Linux".
  { name: "line", re: /\bLine\/\d/ },
  { name: "wechat", re: /MicroMessenger/i },
  { name: "pinterest", re: /\[Pinterest\/|Pinterest for (?:iOS|Android)/i },
];

function detectInApp(ua: string): InAppName | null {
  for (const rule of IN_APP_RULES) {
    if (rule.re.test(ua)) {
      return rule.name;
    }
  }
  return null;
}

function detectDevice(ua: string, os: OsName): DeviceType {
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) {
    return "tablet";
  }
  // Android without "Mobile" is the conventional tablet signal.
  if (os === "android" && !/Mobile/i.test(ua)) {
    return "tablet";
  }
  if (/Mobi|iPhone|iPod|Windows Phone|IEMobile|Opera Mini/i.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

export function parseUserAgent(userAgent: string | null | undefined): ParsedUa {
  // Several of the browser patterns backtrack quadratically, and this runs on every
  // edge request against an attacker-controlled header. 512 is what gets stored anyway.
  const ua = (userAgent ?? "").slice(0, 512);

  if (ua === "") {
    return {
      device: "desktop",
      os: "other",
      osVersion: "",
      browser: "other",
      browserVersion: "",
      inApp: null,
      isBot: true,
    };
  }

  let os: OsName = "other";
  let osVersion = "";
  for (const rule of OS_RULES) {
    const match = rule.re.exec(ua);
    if (match) {
      os = rule.name;
      const raw = match[1] ?? "";
      osVersion = rule.normalize ? rule.normalize(raw) : raw;
      break;
    }
  }

  let browser: BrowserName = "other";
  let browserVersion = "";
  for (const rule of BROWSER_RULES) {
    const match = rule.re.exec(ua);
    if (match) {
      browser = rule.name;
      browserVersion = match[1] ?? "";
      break;
    }
  }

  return {
    device: detectDevice(ua, os),
    os,
    osVersion,
    browser,
    browserVersion,
    inApp: detectInApp(ua),
    isBot: BOT_PATTERN.test(ua),
  };
}

/** Longest header and entry count worth parsing; real browsers send well under both. */
const ACCEPT_LANGUAGE_MAX_LENGTH = 512;
const ACCEPT_LANGUAGE_MAX_ENTRIES = 24;

/**
 * Primary subtag of the visitor's most preferred language, lowercased (e.g. "tr" for
 * `en-US;q=0.8,tr-TR`). The entry with the highest `q` wins and ties go to the one
 * listed first, which is how browsers order the user's preference list anyway. `*`,
 * `q=0` entries and anything that is not a 2-3 letter ISO 639 code are skipped, so the
 * language condition only ever compares against the one language the visitor reads best.
 */
export function parseAcceptLanguage(header: string | null | undefined): string {
  if (!header) {
    return "";
  }
  const entries = header.slice(0, ACCEPT_LANGUAGE_MAX_LENGTH).split(",", ACCEPT_LANGUAGE_MAX_ENTRIES);

  let best = "";
  let bestQ = 0;
  for (const entry of entries) {
    const [rawTag = "", ...params] = entry.split(";");
    const primary = rawTag.trim().split(/[-_]/)[0]?.toLowerCase() ?? "";
    if (!/^[a-z]{2,3}$/.test(primary)) {
      continue;
    }
    let q = 1;
    for (const param of params) {
      const match = /^\s*q\s*=\s*([\d.]+)\s*$/i.exec(param);
      if (match) {
        const parsed = Number.parseFloat(match[1] ?? "");
        q = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 1) : 0;
      }
    }
    if (q > bestQ) {
      best = primary;
      bestQ = q;
    }
  }
  return best;
}

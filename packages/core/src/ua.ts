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

export type ParsedUa = {
  device: DeviceType;
  os: OsName;
  osVersion: string;
  browser: BrowserName;
  browserVersion: string;
  isBot: boolean;
};

const BOT_PATTERN =
  /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|embedly|quora link preview|showyoubot|outbrain|pinterest|vkshare|w3c_validator|whatsapp|telegrambot|discordbot|slackbot|twitterbot|linkedinbot|applebot|bingpreview|headlesschrome|lighthouse|preview|monitor|curl|wget|python-requests|axios|go-http-client|okhttp|postman/i;

/** Order matters: more specific tokens are tested before the generic ones they contain. */
const BROWSER_RULES: Array<{ name: BrowserName; re: RegExp }> = [
  { name: "edge", re: /Edg(?:e|A|iOS)?\/([\d.]+)/i },
  { name: "opera", re: /(?:OPR|Opera)\/([\d.]+)/i },
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
  { name: "chromeos", re: /CrOS \w+ ([\d.]+)/i },
  { name: "windows", re: /Windows NT ([\d.]+)/i },
  { name: "macos", re: /Mac OS X ([\d_.]+)/i, normalize: (raw) => raw.replace(/_/g, ".") },
  { name: "macos", re: /Macintosh/i },
  { name: "linux", re: /Linux|X11|Ubuntu|Fedora/i },
];

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
    isBot: BOT_PATTERN.test(ua),
  };
}

/** First language subtag of an Accept-Language header, lowercased (e.g. "tr"). */
export function parseAcceptLanguage(header: string | null | undefined): string {
  if (!header) {
    return "";
  }
  const first = header.split(",")[0];
  if (!first) {
    return "";
  }
  const tag = first.split(";")[0]?.trim() ?? "";
  return tag.split("-")[0]?.toLowerCase() ?? "";
}

import type { IconName } from "@/components/kit/icon";

export const SOCIAL_ICONS: Record<string, IconName> = {
  x: "x-twitter",
  instagram: "instagram",
  youtube: "youtube",
  tiktok: "tiktok",
  linkedin: "linkedin",
  github: "github",
  facebook: "facebook",
  whatsapp: "whatsapp",
  telegram: "telegram",
  email: "envelope",
  website: "globe",
};

export const SOCIAL_LABELS: Record<string, string> = {
  x: "X",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  github: "GitHub",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  email: "Email",
  website: "Website",
};

export function socialIcon(platform: string): IconName {
  return SOCIAL_ICONS[platform] ?? "at";
}

/** `mailto:` and `https://wa.me/` need building from a raw handle or address. */
/** Profile URL for a bare handle ("acme" or "@acme"), keyed by platform. */
const PROFILE_URLS: Partial<Record<string, { host: string; build: (handle: string) => string }>> = {
  x: { host: "x.com", build: (h) => `https://x.com/${h}` },
  instagram: { host: "instagram.com", build: (h) => `https://instagram.com/${h}` },
  youtube: { host: "youtube.com", build: (h) => `https://youtube.com/@${h}` },
  tiktok: { host: "tiktok.com", build: (h) => `https://tiktok.com/@${h}` },
  linkedin: { host: "linkedin.com", build: (h) => `https://linkedin.com/in/${h}` },
  github: { host: "github.com", build: (h) => `https://github.com/${h}` },
  facebook: { host: "facebook.com", build: (h) => `https://facebook.com/${h}` },
  telegram: { host: "t.me", build: (h) => `https://t.me/${h}` },
};

const HANDLE_PATTERN = /^@?[A-Za-z0-9._-]{1,100}$/;

export function socialHref(platform: string, value: string): string {
  const trimmed = value.trim();
  if (platform === "email") {
    return trimmed.startsWith("mailto:") ? trimmed : `mailto:${trimmed}`;
  }
  if (platform === "whatsapp" && /^[+\d][\d\s-]*$/.test(trimmed)) {
    return `https://wa.me/${trimmed.replace(/[^\d]/g, "")}`;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  // A bare handle would otherwise become https://acme. Handles may contain dots
  // (instagram "john.doe"), so only something naming the platform's own host is a URL.
  const profile = PROFILE_URLS[platform];
  if (profile && HANDLE_PATTERN.test(trimmed) && !trimmed.toLowerCase().includes(profile.host)) {
    return profile.build(encodeURIComponent(trimmed.replace(/^@/, "")));
  }
  return `https://${trimmed}`;
}

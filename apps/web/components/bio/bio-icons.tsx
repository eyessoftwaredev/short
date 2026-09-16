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
export function socialHref(platform: string, value: string): string {
  const trimmed = value.trim();
  if (platform === "email") {
    return trimmed.startsWith("mailto:") ? trimmed : `mailto:${trimmed}`;
  }
  if (platform === "whatsapp" && /^[+\d][\d\s-]*$/.test(trimmed)) {
    return `https://wa.me/${trimmed.replace(/[^\d]/g, "")}`;
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

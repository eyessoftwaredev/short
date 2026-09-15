import {
  AtSign,
  Briefcase,
  Camera,
  Code2,
  Globe,
  Hash,
  Mail,
  MessageCircle,
  Music2,
  Send,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

/**
 * Lucide dropped brand marks, and pulling in a brand-icon package for ten glyphs is not
 * worth the weight. These are category icons; the accessible name carries the platform.
 */
export const SOCIAL_ICONS: Record<string, LucideIcon> = {
  x: Hash,
  instagram: Camera,
  youtube: Video,
  tiktok: Music2,
  linkedin: Briefcase,
  github: Code2,
  facebook: Users,
  whatsapp: MessageCircle,
  telegram: Send,
  email: Mail,
  website: Globe,
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

export function socialIcon(platform: string): LucideIcon {
  return SOCIAL_ICONS[platform] ?? AtSign;
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

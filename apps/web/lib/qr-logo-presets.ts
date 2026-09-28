import { QR_LOGO_EMOJI } from "./qr-logo-emoji.generated";

/**
 * Built-in QR centre logos (brand/contact icons and a Twemoji pack).
 *
 * A preset is stored in `style.logoUrl` as a first-party path, `/api/qr/logos/<id>`,
 * exactly like uploaded media is stored as `/api/media/<uuid>`:
 * - the browser preview loads it as a normal image (served by app/api/qr/logos),
 * - exports resolve it in-process to an SVG data URI (lib/qr-export.ts), no fetch,
 * - it is not workspace media, so ownership checks accept it by catalogue membership.
 *
 * This module is client-safe: the artwork lives in lib/qr-logo-svg.ts (server-only).
 */

export type QrLogoPresetCategory = "social" | "contact" | "emoji";

export type QrLogoPreset = {
  id: string;
  category: QrLogoPresetCategory;
  en: string;
  tr: string;
  /** Extra search terms, space separated, in both languages. */
  keywords: string;
};

export const QR_LOGO_PRESET_BASE = "/api/qr/logos/";
const PRESET_PATH = /^\/api\/qr\/logos\/([a-z0-9-]{1,64})$/;

type PresetSeed = [id: string, en: string, tr: string, keywords?: string];

const SOCIAL: PresetSeed[] = [
  ["instagram", "Instagram", "Instagram", "ig insta reels"],
  ["facebook", "Facebook", "Facebook", "fb meta"],
  ["x", "X (Twitter)", "X (Twitter)", "twitter tweet"],
  ["tiktok", "TikTok", "TikTok", "video"],
  ["youtube", "YouTube", "YouTube", "video yt"],
  ["linkedin", "LinkedIn", "LinkedIn", "job career iş kariyer"],
  ["whatsapp", "WhatsApp", "WhatsApp", "chat message mesaj"],
  ["telegram", "Telegram", "Telegram", "chat message mesaj"],
  ["messenger", "Messenger", "Messenger", "facebook chat mesaj"],
  ["threads", "Threads", "Threads", "meta instagram"],
  ["snapchat", "Snapchat", "Snapchat", "snap"],
  ["pinterest", "Pinterest", "Pinterest", "pin"],
  ["spotify", "Spotify", "Spotify", "music podcast müzik"],
  ["soundcloud", "SoundCloud", "SoundCloud", "music müzik"],
  ["discord", "Discord", "Discord", "chat community topluluk"],
  ["twitch", "Twitch", "Twitch", "stream live yayın canlı"],
  ["reddit", "Reddit", "Reddit", "forum"],
  ["bluesky", "Bluesky", "Bluesky", "bsky"],
  ["mastodon", "Mastodon", "Mastodon", "fediverse"],
  ["github", "GitHub", "GitHub", "code git kod"],
  ["behance", "Behance", "Behance", "portfolio portfolyo"],
  ["dribbble", "Dribbble", "Dribbble", "design tasarım"],
  ["medium", "Medium", "Medium", "blog"],
  ["vimeo", "Vimeo", "Vimeo", "video"],
  ["patreon", "Patreon", "Patreon", "support destek"],
  ["app-store", "App Store", "App Store", "apple ios iphone download indir"],
  ["google-play", "Google Play", "Google Play", "android download indir"],
  ["apple", "Apple", "Apple", "ios mac"],
  ["android", "Android", "Android", "google"],
  ["google", "Google", "Google", "review yorum maps"],
  ["amazon", "Amazon", "Amazon", "shop mağaza"],
  ["shopify", "Shopify", "Shopify", "shop store mağaza"],
  ["etsy", "Etsy", "Etsy", "shop mağaza"],
  ["paypal", "PayPal", "PayPal", "pay payment ödeme"],
  ["airbnb", "Airbnb", "Airbnb", "stay rent konaklama"],
  ["yelp", "Yelp", "Yelp", "review yorum"],
  ["viber", "Viber", "Viber", "chat mesaj"],
  ["wechat", "WeChat", "WeChat", "weixin chat"],
  ["line", "LINE", "LINE", "chat mesaj"],
  ["signal", "Signal", "Signal", "chat mesaj"],
];

const CONTACT: PresetSeed[] = [
  ["email", "Email", "E-posta", "mail gmail envelope zarf"],
  ["phone", "Phone", "Telefon", "call ara arama"],
  ["sms", "Message", "Mesaj", "sms chat text"],
  ["wifi", "Wi-Fi", "Wi-Fi", "wireless internet kablosuz"],
  ["website", "Website", "Web sitesi", "globe web internet site"],
  ["location", "Location", "Konum", "map pin address harita adres"],
  ["link", "Link", "Bağlantı", "url"],
  ["vcard", "Contact card", "Kartvizit", "vcard contact kişi"],
  ["calendar", "Calendar", "Takvim", "event date etkinlik tarih"],
  ["menu", "Menu", "Menü", "restaurant food restoran yemek"],
  ["coffee", "Coffee", "Kahve", "cafe kafe"],
  ["shop", "Shop", "Mağaza", "bag store alışveriş"],
  ["cart", "Cart", "Sepet", "shopping alışveriş"],
  ["payment", "Payment", "Ödeme", "card pay kart"],
  ["pdf", "PDF", "PDF", "document file belge dosya"],
  ["download", "Download", "İndir", "app uygulama"],
  ["video", "Video", "Video", "play oynat"],
  ["music", "Music", "Müzik", "song şarkı"],
  ["camera", "Photo", "Fotoğraf", "camera kamera"],
  ["review", "Review", "Değerlendirme", "star rating yıldız puan"],
  ["heart", "Heart", "Kalp", "love like beğen"],
  ["gift", "Gift", "Hediye", "present promo kampanya"],
  ["ticket", "Ticket", "Bilet", "event coupon kupon"],
];

function seed(category: QrLogoPresetCategory, rows: PresetSeed[]): QrLogoPreset[] {
  return rows.map(([id, en, tr, keywords = ""]) => ({ id, category, en, tr, keywords }));
}

export const QR_LOGO_PRESETS: readonly QrLogoPreset[] = [
  ...seed("social", SOCIAL),
  ...seed("contact", CONTACT),
  ...QR_LOGO_EMOJI.map((emoji) => ({
    id: `emoji-${emoji.code}`,
    category: "emoji" as const,
    en: emoji.en,
    tr: emoji.tr,
    keywords: `${emoji.keywords} ${emoji.char}`,
  })),
];

const BY_ID = new Map(QR_LOGO_PRESETS.map((preset) => [preset.id, preset]));

export function qrLogoPresetUrl(id: string): string {
  return `${QR_LOGO_PRESET_BASE}${id}`;
}

export function getQrLogoPreset(id: string): QrLogoPreset | null {
  return BY_ID.get(id) ?? null;
}

/** The preset behind a stored logo value, or null for media paths and unknown ids. */
export function parseQrLogoPreset(value: string | null | undefined): QrLogoPreset | null {
  if (!value) {
    return null;
  }
  const match = PRESET_PATH.exec(value.trim());
  return match?.[1] ? getQrLogoPreset(match[1]) : null;
}

export function isQrLogoPreset(value: string | null | undefined): boolean {
  return parseQrLogoPreset(value) !== null;
}

/** Turkish-aware, accent-insensitive folding so "kalp", "KALP" and "Kalp" all match. */
function fold(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i");
}

export function searchQrLogoPresets(
  presets: readonly QrLogoPreset[],
  query: string,
): QrLogoPreset[] {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return [...presets];
  }
  return presets.filter((preset) => {
    const haystack = fold(`${preset.id} ${preset.en} ${preset.tr} ${preset.keywords}`);
    return terms.every((term) => haystack.includes(term));
  });
}

/**
 * `qrStyleSchema` in @short/core only admits `/api/media/<uuid>` logos. A preset is
 * validated here instead (catalogue membership) and swapped out around the core parse,
 * so every other style rule still runs. Harmless once core accepts preset paths itself.
 */
export function parseWithQrLogoPreset<T extends { style: { logoUrl: string | null } }>(
  logoUrl: string | null,
  parse: (logoUrl: string | null) => T,
): T {
  const preset = parseQrLogoPreset(logoUrl);
  if (!preset) {
    return parse(logoUrl);
  }
  const parsed = parse(null);
  return { ...parsed, style: { ...parsed.style, logoUrl: qrLogoPresetUrl(preset.id) } };
}

import "server-only";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faAirbnb,
  faAmazon,
  faAndroid,
  faApple,
  faAppStoreIos,
  faBehance,
  faBluesky,
  faDiscord,
  faDribbble,
  faEtsy,
  faFacebook,
  faFacebookMessenger,
  faGithub,
  faGoogle,
  faGooglePlay,
  faInstagram,
  faLine,
  faLinkedin,
  faMastodon,
  faMedium,
  faPatreon,
  faPaypal,
  faPinterest,
  faReddit,
  faShopify,
  faSignalMessenger,
  faSnapchat,
  faSoundcloud,
  faSpotify,
  faTelegram,
  faThreads,
  faTiktok,
  faTwitch,
  faViber,
  faVimeoV,
  faWeixin,
  faWhatsapp,
  faXTwitter,
  faYelp,
  faYoutube,
} from "@fortawesome/free-brands-svg-icons";
import {
  faAddressCard,
  faBagShopping,
  faCalendarDays,
  faCamera,
  faCartShopping,
  faCommentDots,
  faCreditCard,
  faDownload,
  faEnvelope,
  faFilePdf,
  faGift,
  faGlobe,
  faHeart,
  faLink,
  faLocationDot,
  faMugHot,
  faMusic,
  faPhone,
  faPlay,
  faStar,
  faTicket,
  faUtensils,
  faWifi,
} from "@fortawesome/free-solid-svg-icons";
import { QR_LOGO_EMOJI_SVG } from "./qr-logo-emoji-svg.generated";
import { getQrLogoPreset } from "./qr-logo-presets";

/**
 * Artwork for the built-in QR logos. Brand and contact icons are drawn from Font Awesome
 * Free path data (icons CC-BY 4.0, already a panel dependency) as a brand-coloured glyph
 * on a white rounded tile, so they read on any QR colour; emoji are vendored Twemoji.
 * Everything is plain vector markup: sharp/librsvg rasterizes it with no fonts.
 */

type Gradient = { angle: "diagonal" | "vertical"; stops: string[] };

type IconArt = {
  icon: IconDefinition;
  color: string;
  gradient?: Gradient;
  /** Tile fill; white unless the brand's recognisable form is a coloured tile. */
  tile?: string;
  /** Outline drawn around the glyph (e.g. Snapchat's black-edged ghost). */
  outline?: string;
  /** Offset colour ghosts behind the glyph (TikTok's cyan/red split). */
  echoes?: { color: string; dx: number; dy: number }[];
};

const ICONS: Record<string, IconArt> = {
  instagram: {
    icon: faInstagram,
    color: "#E4405F",
    gradient: { angle: "diagonal", stops: ["#FEDA75", "#FA7E1E", "#D62976", "#962FBF", "#4F5BD5"] },
  },
  facebook: { icon: faFacebook, color: "#0866FF" },
  x: { icon: faXTwitter, color: "#000000" },
  tiktok: {
    icon: faTiktok,
    color: "#000000",
    echoes: [
      { color: "#25F4EE", dx: -10, dy: -8 },
      { color: "#FE2C55", dx: 10, dy: 8 },
    ],
  },
  youtube: { icon: faYoutube, color: "#FF0000" },
  linkedin: { icon: faLinkedin, color: "#0A66C2" },
  whatsapp: { icon: faWhatsapp, color: "#25D366" },
  telegram: { icon: faTelegram, color: "#26A5E4" },
  messenger: {
    icon: faFacebookMessenger,
    color: "#0866FF",
    gradient: { angle: "diagonal", stops: ["#0099FF", "#A033FF", "#FF5280", "#FF7061"] },
  },
  threads: { icon: faThreads, color: "#000000" },
  snapchat: { icon: faSnapchat, color: "#FFFFFF", tile: "#FFFC00", outline: "#000000" },
  pinterest: { icon: faPinterest, color: "#E60023" },
  spotify: { icon: faSpotify, color: "#1DB954" },
  soundcloud: { icon: faSoundcloud, color: "#FF5500" },
  discord: { icon: faDiscord, color: "#5865F2" },
  twitch: { icon: faTwitch, color: "#9146FF" },
  reddit: { icon: faReddit, color: "#FF4500" },
  bluesky: { icon: faBluesky, color: "#1185FE" },
  mastodon: { icon: faMastodon, color: "#6364FF" },
  github: { icon: faGithub, color: "#181717" },
  behance: { icon: faBehance, color: "#1769FF" },
  dribbble: { icon: faDribbble, color: "#EA4C89" },
  medium: { icon: faMedium, color: "#000000" },
  vimeo: { icon: faVimeoV, color: "#1AB7EA" },
  patreon: { icon: faPatreon, color: "#FF424D" },
  "app-store": {
    icon: faAppStoreIos,
    color: "#0D96F6",
    gradient: { angle: "vertical", stops: ["#18BFFB", "#2072F3"] },
  },
  "google-play": {
    icon: faGooglePlay,
    color: "#01875F",
    gradient: { angle: "diagonal", stops: ["#00D7FE", "#00F076", "#FFD500", "#FF3A44"] },
  },
  apple: { icon: faApple, color: "#000000" },
  android: { icon: faAndroid, color: "#3DDC84" },
  google: { icon: faGoogle, color: "#4285F4" },
  amazon: { icon: faAmazon, color: "#FF9900" },
  shopify: { icon: faShopify, color: "#5E8E3E" },
  etsy: { icon: faEtsy, color: "#F1641E" },
  paypal: { icon: faPaypal, color: "#003087" },
  airbnb: { icon: faAirbnb, color: "#FF5A5F" },
  yelp: { icon: faYelp, color: "#D32323" },
  viber: { icon: faViber, color: "#7360F2" },
  wechat: { icon: faWeixin, color: "#07C160" },
  line: { icon: faLine, color: "#06C755" },
  signal: { icon: faSignalMessenger, color: "#3A76F0" },

  email: { icon: faEnvelope, color: "#EA4335" },
  phone: { icon: faPhone, color: "#16A34A" },
  sms: { icon: faCommentDots, color: "#0EA5E9" },
  wifi: { icon: faWifi, color: "#2563EB" },
  website: { icon: faGlobe, color: "#0F766E" },
  location: { icon: faLocationDot, color: "#EA4335" },
  link: { icon: faLink, color: "#2563EB" },
  vcard: { icon: faAddressCard, color: "#0F766E" },
  calendar: { icon: faCalendarDays, color: "#7C3AED" },
  menu: { icon: faUtensils, color: "#B45309" },
  coffee: { icon: faMugHot, color: "#78350F" },
  shop: { icon: faBagShopping, color: "#DB2777" },
  cart: { icon: faCartShopping, color: "#EA580C" },
  payment: { icon: faCreditCard, color: "#0F766E" },
  pdf: { icon: faFilePdf, color: "#DC2626" },
  download: { icon: faDownload, color: "#0F766E" },
  video: { icon: faPlay, color: "#DC2626" },
  music: { icon: faMusic, color: "#9333EA" },
  camera: { icon: faCamera, color: "#111827" },
  review: { icon: faStar, color: "#F59E0B" },
  heart: { icon: faHeart, color: "#E11D48" },
  gift: { icon: faGift, color: "#DB2777" },
  ticket: { icon: faTicket, color: "#7C3AED" },
};

const CANVAS = 512;
const TILE_RADIUS = 112;
/** Longest glyph side as a share of the tile; leaves a comfortable margin. */
const GLYPH_BOX = 352;

function num(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function pathData(icon: IconDefinition): string {
  const data = icon.icon[4];
  return Array.isArray(data) ? data.join(" ") : data;
}

function renderIcon(art: IconArt): string {
  const [width, height] = art.icon.icon;
  const scale = GLYPH_BOX / Math.max(width, height);
  const x = (CANVAS - width * scale) / 2;
  const y = (CANVAS - height * scale) / 2;
  const d = pathData(art.icon);

  const defs: string[] = [];
  let fill = art.color;
  if (art.gradient) {
    const { stops, angle } = art.gradient;
    const [x1, y1, x2, y2] = angle === "diagonal" ? [0, 1, 1, 0] : [0, 0, 0, 1];
    const stopMarkup = stops
      .map((color, index) => `<stop offset="${num(index / (stops.length - 1))}" stop-color="${color}"/>`)
      .join("");
    defs.push(
      `<linearGradient id="g" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stopMarkup}</linearGradient>`,
    );
    fill = "url(#g)";
  }

  const glyph = (color: string, dx = 0, dy = 0, extra = "") =>
    `<path transform="translate(${num(x + dx)} ${num(y + dy)}) scale(${num(scale)})" fill="${color}"${extra} d="${d}"/>`;

  const layers = [
    ...(art.echoes ?? []).map((echo) => glyph(echo.color, echo.dx, echo.dy)),
    art.outline
      ? glyph(
          fill,
          0,
          0,
          ` stroke="${art.outline}" stroke-width="${num(20 / scale)}" stroke-linejoin="round" paint-order="stroke"`,
        )
      : glyph(fill),
  ];

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">`,
    defs.length > 0 ? `<defs>${defs.join("")}</defs>` : "",
    `<rect width="${CANVAS}" height="${CANVAS}" rx="${TILE_RADIUS}" fill="${art.tile ?? "#FFFFFF"}"/>`,
    ...layers,
    `</svg>`,
  ].join("");
}

const cache = new Map<string, string>();

/** SVG markup for a built-in logo id, or null when the id is not in the catalogue. */
export function getQrLogoPresetSvg(id: string): string | null {
  const preset = getQrLogoPreset(id);
  if (!preset) {
    return null;
  }
  const cached = cache.get(id);
  if (cached) {
    return cached;
  }

  let svg: string | null = null;
  if (preset.category === "emoji") {
    svg = QR_LOGO_EMOJI_SVG[id.slice("emoji-".length)] ?? null;
  } else {
    const art = ICONS[id];
    svg = art ? renderIcon(art) : null;
  }

  if (svg) {
    cache.set(id, svg);
  }
  return svg;
}

export function qrLogoPresetDataUri(id: string): string | null {
  const svg = getQrLogoPresetSvg(id);
  return svg ? `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}` : null;
}

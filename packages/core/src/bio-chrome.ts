export const BIOPAGE_FONTS = [
  "sans",
  "serif",
  "mono",
  "inter",
  "poppins",
  "playfair",
  "space",
] as const;
export type BiopageFont = (typeof BIOPAGE_FONTS)[number];

export const BIOPAGE_BG_TYPES = ["theme", "color", "gradient", "image"] as const;
export type BiopageBgType = (typeof BIOPAGE_BG_TYPES)[number];

export const BIOPAGE_PROFILE_MODES = ["photo", "text", "logo"] as const;
export type BiopageProfileMode = (typeof BIOPAGE_PROFILE_MODES)[number];

export const BIOPAGE_LINK_ICONS = [
  "link",
  "globe",
  "envelope",
  "image",
  "calendar",
  "tag",
  "book",
  "bolt",
  "sparkles",
  "lock",
  "users",
  "qrcode",
  "share-nodes",
  "instagram",
  "youtube",
  "whatsapp",
  "github",
  "linkedin",
  "x-twitter",
  "facebook",
  "telegram",
  "tiktok",
] as const;
export type BiopageLinkIcon = (typeof BIOPAGE_LINK_ICONS)[number];

export const BIOPAGE_TEMPLATES = [
  "minimal",
  "midnight",
  "sunset",
  "forest",
  "mono",
  "candy",
  "glass",
  "neon",
] as const;
export type BiopageTemplateId = (typeof BIOPAGE_TEMPLATES)[number];

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isHexColor(value: string): boolean {
  return HEX.test(value);
}

/** Apex, bare host and www all serve the same platform bio pages. */
export function platformHostAliases(host: string): string[] {
  const normalized = host.trim().toLowerCase();
  if (normalized === "") {
    return [];
  }
  const aliases = new Set<string>([normalized]);
  const bare = normalized.replace(/^www\./, "");
  aliases.add(bare);
  aliases.add(`www.${bare}`);
  const labels = bare.split(".");
  // `app.short.ky` is the panel; bios still live on the registrable domain.
  if (labels.length >= 3) {
    const apex = labels.slice(-2).join(".");
    aliases.add(apex);
    aliases.add(`www.${apex}`);
  }
  return [...aliases];
}

export function isPlatformRequestHost(hostname: string, platformHost: string): boolean {
  return platformHostAliases(platformHost).includes(hostname.trim().toLowerCase());
}

const CSS_PROPS = new Set([
  "color",
  "background",
  "background-color",
  "background-image",
  "border",
  "border-color",
  "border-radius",
  "box-shadow",
  "font-size",
  "font-weight",
  "letter-spacing",
  "line-height",
  "padding",
  "margin",
  "opacity",
  "max-width",
  "text-align",
  "gap",
  "display",
]);

const CSS_FORBIDDEN = /@import|@charset|expression\s*\(|javascript:|behavior:|-moz-binding|url\s*\(\s*['"]?\s*(?:javascript|data):/i;

/**
 * Root-only declaration list. Selectors, at-rules, and script-capable values are dropped.
 */
export function sanitizeBioCss(input: string): string {
  if (input.trim() === "" || CSS_FORBIDDEN.test(input)) {
    return "";
  }

  const declarations: string[] = [];
  for (const raw of input.split(";")) {
    const part = raw.trim();
    if (part === "") {
      continue;
    }
    const colon = part.indexOf(":");
    if (colon < 1) {
      continue;
    }
    const property = part.slice(0, colon).trim().toLowerCase();
    const value = part.slice(colon + 1).trim();
    if (!CSS_PROPS.has(property) || value === "" || CSS_FORBIDDEN.test(value)) {
      continue;
    }
    if (property === "display" && !/^(block|flex|grid|none)$/i.test(value)) {
      continue;
    }
    if (property === "background-image" && !/^(none|linear-gradient\()/i.test(value)) {
      continue;
    }
    declarations.push(`${property}: ${value}`);
  }
  return declarations.join("; ");
}

export function isBiopageLive(
  page: {
    published: boolean;
    publishAt?: Date | number | string | null;
    unpublishAt?: Date | number | string | null;
  },
  now = Date.now(),
): boolean {
  if (!page.published) {
    return false;
  }
  const start = toMillis(page.publishAt);
  const end = toMillis(page.unpublishAt);
  if (start !== null && now < start) {
    return false;
  }
  if (end !== null && now > end) {
    return false;
  }
  return true;
}

function toMillis(value: Date | number | string | null | undefined): number | null {
  if (value == null || value === "") {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export const FONT_STACKS: Record<BiopageFont, string> = {
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  serif: 'ui-serif, Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
  inter: 'Inter, ui-sans-serif, system-ui, sans-serif',
  poppins: 'Poppins, ui-sans-serif, system-ui, sans-serif',
  playfair: '"Playfair Display", ui-serif, Georgia, serif',
  space: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
};

export const GOOGLE_FONT_HREF: Partial<Record<BiopageFont, string>> = {
  inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap",
  poppins: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap",
  playfair: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&display=swap",
  space: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap",
};

export type BiopageTemplate = {
  id: BiopageTemplateId;
  theme: "minimal" | "midnight" | "sunset" | "forest" | "mono" | "candy";
  buttonStyle: "solid" | "outline" | "soft" | "pill";
  fontFamily: BiopageFont;
  bgType: BiopageBgType;
  bgColor: string | null;
  bgGradient: string | null;
  buttonColor: string | null;
  buttonTextColor: string | null;
  textColor: string | null;
};

export const BIOPAGE_TEMPLATE_PRESETS: Record<BiopageTemplateId, BiopageTemplate> = {
  minimal: {
    id: "minimal",
    theme: "minimal",
    buttonStyle: "solid",
    fontFamily: "sans",
    bgType: "theme",
    bgColor: null,
    bgGradient: null,
    buttonColor: null,
    buttonTextColor: null,
    textColor: null,
  },
  midnight: {
    id: "midnight",
    theme: "midnight",
    buttonStyle: "soft",
    fontFamily: "inter",
    bgType: "theme",
    bgColor: null,
    bgGradient: null,
    buttonColor: null,
    buttonTextColor: null,
    textColor: null,
  },
  sunset: {
    id: "sunset",
    theme: "sunset",
    buttonStyle: "pill",
    fontFamily: "poppins",
    bgType: "theme",
    bgColor: null,
    bgGradient: null,
    buttonColor: null,
    buttonTextColor: null,
    textColor: null,
  },
  forest: {
    id: "forest",
    theme: "forest",
    buttonStyle: "solid",
    fontFamily: "serif",
    bgType: "theme",
    bgColor: null,
    bgGradient: null,
    buttonColor: null,
    buttonTextColor: null,
    textColor: null,
  },
  mono: {
    id: "mono",
    theme: "mono",
    buttonStyle: "outline",
    fontFamily: "mono",
    bgType: "theme",
    bgColor: null,
    bgGradient: null,
    buttonColor: null,
    buttonTextColor: null,
    textColor: null,
  },
  candy: {
    id: "candy",
    theme: "candy",
    buttonStyle: "pill",
    fontFamily: "space",
    bgType: "theme",
    bgColor: null,
    bgGradient: null,
    buttonColor: null,
    buttonTextColor: null,
    textColor: null,
  },
  glass: {
    id: "glass",
    theme: "midnight",
    buttonStyle: "soft",
    fontFamily: "inter",
    bgType: "gradient",
    bgColor: null,
    bgGradient: "linear-gradient(160deg, #0f172a 0%, #1e293b 55%, #334155 100%)",
    buttonColor: "#e2e8f0",
    buttonTextColor: "#0f172a",
    textColor: "#f8fafc",
  },
  neon: {
    id: "neon",
    theme: "midnight",
    buttonStyle: "solid",
    fontFamily: "space",
    bgType: "color",
    bgColor: "#050505",
    bgGradient: null,
    buttonColor: "#22d3ee",
    buttonTextColor: "#042f2e",
    textColor: "#ecfeff",
  },
};

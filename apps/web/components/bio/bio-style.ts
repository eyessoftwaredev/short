import type { CSSProperties } from "react";
import type { BiopageTheme } from "@short/core";

/**
 * Shared look-and-feel helpers for the public bio page, the builder preview and the
 * small thumbnails on the list / template picker, so all three paint a page the same way.
 * Everything here is server-safe (no hooks, no browser APIs).
 */

export type BioLook = {
  theme: BiopageTheme;
  buttonStyle: string;
  bgType?: "theme" | "color" | "gradient" | "image";
  bgColor?: string | null;
  bgGradient?: string | null;
  bgImageUrl?: string | null;
  buttonColor?: string | null;
  buttonTextColor?: string | null;
  textColor?: string | null;
};

/**
 * Page background colour per theme, mirrored from the `.bio-theme-*` palettes in
 * globals.css. Used for the browser chrome colour (`theme-color`) on phones.
 */
export const BIO_THEME_BACKGROUNDS: Record<BiopageTheme, string> = {
  minimal: "#fafaf9",
  midnight: "#0b1120",
  sunset: "#fff6f0",
  forest: "#f2f7f3",
  mono: "#111111",
  candy: "#fdf2f8",
};

/**
 * Button shapes. Every variant keeps a 1–2px border so switching styles never shifts
 * the layout, and the label colour is set explicitly so the panel's global `a:hover`
 * colour can never leak into a visitor's page.
 */
export const BIO_BUTTON_CLASSES: Record<string, string> = {
  solid:
    "rounded-2xl border border-bio-accent bg-bio-accent text-bio-on-accent shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:text-bio-on-accent",
  outline:
    "rounded-2xl border-2 border-bio-accent bg-transparent text-bio-accent hover:bg-bio-accent/10 hover:text-bio-accent",
  soft: "rounded-2xl border border-bio-border bg-bio-card text-bio-fg shadow-[0_1px_2px_rgb(0_0_0/0.05)] hover:text-bio-fg",
  pill: "rounded-full border border-bio-accent bg-bio-accent text-bio-on-accent shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:text-bio-on-accent",
};

export function bioButtonClass(style: string): string {
  return BIO_BUTTON_CLASSES[style] ?? BIO_BUTTON_CLASSES.solid;
}

/**
 * Only real gradients: a free-form value could pull `url(...)` from a third party and
 * log every visitor's IP.
 */
export function safeGradient(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (
    !/^(repeating-)?(linear|radial|conic)-gradient\(/i.test(trimmed) ||
    /url\s*\(|image-set|expression/i.test(trimmed)
  ) {
    return null;
  }
  return trimmed;
}

/** Background + text colour overrides for the page surface. */
export function bioSurfaceStyle(look: BioLook): CSSProperties {
  const style: CSSProperties = {};
  if (look.textColor) {
    style.color = look.textColor;
  }
  if (look.bgType === "color" && look.bgColor) {
    style.backgroundColor = look.bgColor;
    style.backgroundImage = "none";
  }
  const gradient = look.bgType === "gradient" ? safeGradient(look.bgGradient) : null;
  if (gradient) {
    style.backgroundImage = gradient;
  }
  if (look.bgType === "image" && look.bgImageUrl) {
    style.backgroundImage = `url(${JSON.stringify(look.bgImageUrl)})`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
  }
  return style;
}

/** True when the theme's own background (with its soft top glow) is in use. */
export function usesThemeBackground(look: BioLook): boolean {
  if (look.bgType === "color" && look.bgColor) {
    return false;
  }
  if (look.bgType === "gradient" && safeGradient(look.bgGradient)) {
    return false;
  }
  if (look.bgType === "image" && look.bgImageUrl) {
    return false;
  }
  return true;
}

/**
 * Custom button colours. An outline button keeps a transparent fill, so its colour
 * goes to the border and label instead of painting it solid.
 */
export function bioButtonStyle(look: BioLook): CSSProperties | undefined {
  if (!look.buttonColor && !look.buttonTextColor) {
    return undefined;
  }
  if (look.buttonStyle === "outline") {
    return {
      borderColor: look.buttonColor ?? undefined,
      color: look.buttonTextColor ?? look.buttonColor ?? undefined,
    };
  }
  return {
    backgroundColor: look.buttonColor ?? undefined,
    borderColor: look.buttonColor ?? undefined,
    color: look.buttonTextColor ?? undefined,
  };
}

export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "•"
  );
}

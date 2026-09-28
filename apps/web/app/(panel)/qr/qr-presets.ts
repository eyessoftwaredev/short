export type QrPaletteId =
  | "classic"
  | "teal"
  | "navy"
  | "plum"
  | "forest"
  | "ocean"
  | "berry"
  | "espresso"
  | "inverted";

export type QrPalette = {
  id: QrPaletteId;
  foreground: string;
  background: string;
  /** Finder-square colour; null keeps them the same as the modules. */
  corner: string | null;
};

/**
 * Known-scannable sets (every pair is at least 4.5:1), so picking a palette never
 * produces a dead code. Applying one also sets or clears the corner colour.
 */
export const QR_PALETTES: readonly QrPalette[] = [
  { id: "classic", foreground: "#171717", background: "#ffffff", corner: null },
  { id: "teal", foreground: "#0f766e", background: "#ffffff", corner: "#134e4a" },
  { id: "navy", foreground: "#0b1120", background: "#e8ecf6", corner: "#1e3a8a" },
  { id: "plum", foreground: "#500724", background: "#fdf2f8", corner: null },
  { id: "forest", foreground: "#14281d", background: "#e2efe6", corner: "#166534" },
  { id: "ocean", foreground: "#0c4a6e", background: "#f0f9ff", corner: "#075985" },
  { id: "berry", foreground: "#701a75", background: "#ffffff", corner: "#86198f" },
  { id: "espresso", foreground: "#3b2314", background: "#fbf6ee", corner: null },
  { id: "inverted", foreground: "#ffffff", background: "#171717", corner: null },
];

function channel(value: number): number {
  const ratio = value / 255;
  return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number | null {
  const normalized = hex.trim().replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => part + part)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return null;
  }

  return (
    0.2126 * channel(Number.parseInt(full.slice(0, 2), 16)) +
    0.7152 * channel(Number.parseInt(full.slice(2, 4), 16)) +
    0.0722 * channel(Number.parseInt(full.slice(4, 6), 16))
  );
}

/**
 * WCAG contrast ratio (1–21) between two hex colours, or null when either is not a
 * valid hex. Scanners need luminance separation, so this is the number that matters.
 */
export function contrastRatio(a: string, b: string): number | null {
  const first = luminance(a);
  const second = luminance(b);
  if (first === null || second === null) {
    return null;
  }
  const [high, low] = first > second ? [first, second] : [second, first];
  return (high + 0.05) / (low + 0.05);
}

/** Below this ratio a colour pair is unlikely to scan at all. */
export const MIN_SCAN_CONTRAST = 3;
/** Below this ratio it scans up close but may fail in dim light or at a distance. */
export const LOW_SCAN_CONTRAST = 4.5;

export type ScanQualityKind = "invalid" | "fail" | "low" | "inverted" | "good";

export type ScanQuality = {
  tone: "success" | "warn" | "danger" | "muted";
  kind: ScanQualityKind;
};

/**
 * Scanners need luminance separation, not hue separation. Light-on-dark codes are also
 * rejected by a fair number of older readers, so they are flagged separately.
 */
export function scanQuality(foreground: string, background: string): ScanQuality {
  const front = luminance(foreground);
  const back = luminance(background);

  if (front === null || back === null) {
    return { tone: "muted", kind: "invalid" };
  }

  const ratio = contrastRatio(foreground, background) ?? 1;
  const inverted = front > back;

  if (ratio < MIN_SCAN_CONTRAST) {
    return { tone: "danger", kind: "fail" };
  }

  // 4.5:1, not 7:1: the old bar flagged the built-in teal palette (5.5:1) as "low
  // contrast" even though it scans reliably, which taught people to ignore the badge.
  if (ratio < LOW_SCAN_CONTRAST) {
    return { tone: "warn", kind: "low" };
  }

  if (inverted) {
    return { tone: "warn", kind: "inverted" };
  }

  return { tone: "success", kind: "good" };
}

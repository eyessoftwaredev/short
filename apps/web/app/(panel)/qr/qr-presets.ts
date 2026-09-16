export type QrPalette = {
  id: "classic" | "teal" | "navy" | "plum" | "forest" | "inverted";
  foreground: string;
  background: string;
};

/** Known-scannable pairs, so picking a colour never produces a dead code. */
export const QR_PALETTES: readonly QrPalette[] = [
  { id: "classic", foreground: "#171717", background: "#ffffff" },
  { id: "teal", foreground: "#0f766e", background: "#ffffff" },
  { id: "navy", foreground: "#0b1120", background: "#e8ecf6" },
  { id: "plum", foreground: "#500724", background: "#fdf2f8" },
  { id: "forest", foreground: "#14281d", background: "#e2efe6" },
  { id: "inverted", foreground: "#ffffff", background: "#171717" },
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

export type ScanQualityKind = "invalid" | "fail" | "low" | "inverted" | "good";

export type ScanQuality = {
  tone: "accent" | "warn" | "danger" | "muted";
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

  const [high, low] = front > back ? [front, back] : [back, front];
  const ratio = (high + 0.05) / (low + 0.05);
  const inverted = front > back;

  if (ratio < 3) {
    return { tone: "danger", kind: "fail" };
  }

  if (ratio < 7) {
    return { tone: "warn", kind: "low" };
  }

  if (inverted) {
    return { tone: "warn", kind: "inverted" };
  }

  return { tone: "accent", kind: "good" };
}

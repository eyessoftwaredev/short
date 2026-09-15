export type QrPalette = {
  id: string;
  label: string;
  foreground: string;
  background: string;
};

/** Known-scannable pairs, so picking a colour never produces a dead code. */
export const QR_PALETTES: readonly QrPalette[] = [
  { id: "classic", label: "Classic", foreground: "#171717", background: "#ffffff" },
  { id: "teal", label: "Teal", foreground: "#0f766e", background: "#ffffff" },
  { id: "navy", label: "Navy", foreground: "#0b1120", background: "#e8ecf6" },
  { id: "plum", label: "Plum", foreground: "#500724", background: "#fdf2f8" },
  { id: "forest", label: "Forest", foreground: "#14281d", background: "#e2efe6" },
  { id: "inverted", label: "Inverted", foreground: "#ffffff", background: "#171717" },
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

export type ScanQuality = {
  tone: "accent" | "warn" | "danger" | "muted";
  label: string;
  advice: string | null;
};

/**
 * Scanners need luminance separation, not hue separation. Light-on-dark codes are also
 * rejected by a fair number of older readers, so they are flagged separately.
 */
export function scanQuality(foreground: string, background: string): ScanQuality {
  const front = luminance(foreground);
  const back = luminance(background);

  if (front === null || back === null) {
    return { tone: "muted", label: "Check colours", advice: null };
  }

  const [high, low] = front > back ? [front, back] : [back, front];
  const ratio = (high + 0.05) / (low + 0.05);
  const inverted = front > back;

  if (ratio < 3) {
    return {
      tone: "danger",
      label: "Will not scan",
      advice: "Foreground and background are too close in brightness. Darken one of them.",
    };
  }

  if (ratio < 7) {
    return {
      tone: "warn",
      label: "Low contrast",
      advice: "Readable up close, but likely to fail on a poster or in dim light.",
    };
  }

  if (inverted) {
    return {
      tone: "warn",
      label: "Inverted",
      advice: "Light modules on a dark background — some older scanners refuse these.",
    };
  }

  return { tone: "accent", label: "Scans well", advice: null };
}

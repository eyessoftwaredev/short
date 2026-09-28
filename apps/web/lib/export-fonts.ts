import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Fonts for server-side SVG rasterization (QR frame labels and captions). sharp's
 * librsvg lays text out through fontconfig, and the slim production image ships no
 * fonts at all, so labels came out blank in PNG/PDF downloads. The bundled Inter files
 * (SIL OFL 1.1, apps/web/assets/fonts) are registered through a generated fonts.conf
 * that also keeps the system font directory. Must run before the first text render,
 * because fontconfig reads its configuration once per process.
 */
let configured = false;

const FONT_FILE = "Inter-400.ttf";

function fontDirectory(): string | null {
  const candidates = [
    path.join(process.cwd(), "assets", "fonts"),
    path.join(process.cwd(), "apps", "web", "assets", "fonts"),
    process.env.APP_ROOT ? path.join(process.env.APP_ROOT, "apps", "web", "assets", "fonts") : null,
  ];
  return candidates.find((dir): dir is string => dir !== null && existsSync(path.join(dir, FONT_FILE))) ?? null;
}

function xmlText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function ensureExportFonts(): void {
  if (configured) {
    return;
  }
  configured = true;
  // An operator-provided configuration wins.
  if (process.env.FONTCONFIG_FILE) {
    return;
  }
  const dir = fontDirectory();
  if (!dir) {
    console.warn("[qr-export] bundled fonts not found; labels depend on system fonts");
    return;
  }
  try {
    const configDir = path.join(tmpdir(), "short-fontconfig");
    mkdirSync(configDir, { recursive: true });
    const file = path.join(configDir, "fonts.conf");
    writeFileSync(
      file,
      `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${xmlText(dir)}</dir>
  <dir>/usr/share/fonts</dir>
  <cachedir>${xmlText(path.join(configDir, "cache"))}</cachedir>
</fontconfig>
`,
    );
    process.env.FONTCONFIG_FILE = file;
  } catch (error) {
    console.warn("[qr-export] could not configure fonts", error);
  }
}

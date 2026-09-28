import { QR_FRAMES, recommendedErrorLevel, type QrFrame, type QrStyle } from "@short/core";
import QRCode from "qrcode";

/**
 * Isomorphic on purpose: the designer renders the exact same SVG in the browser preview
 * that the export route rasterizes on the server.
 */

/**
 * Print resolution of PDF exports (lib/qr-export.ts): a 1024px code becomes an 8.7 cm
 * wide page. Lives here so the designer can state the printed size.
 */
export const QR_PDF_DPI = 300;

/** Printed width in centimetres of a `pixels` wide PDF export. */
export function qrPrintWidthCm(pixels: number): number {
  return Math.round((pixels / QR_PDF_DPI) * 2.54 * 10) / 10;
}

/** Finder patterns are 7x7 modules in three corners and must stay high-contrast squares. */
const FINDER_SIZE = 7;

type Matrix = { size: number; get: (x: number, y: number) => boolean };

function buildMatrix(data: string, style: QrStyle): Matrix {
  const qr = QRCode.create(data, { errorCorrectionLevel: recommendedErrorLevel(style) });
  const size = qr.modules.size;
  const bits = qr.modules.data;
  return {
    size,
    get: (x, y) => x >= 0 && y >= 0 && x < size && y < size && bits[y * size + x] === 1,
  };
}

/**
 * False when `data` does not fit in one QR code at the style's error-correction level
 * (a logo forces H, which roughly halves the capacity). Saving such a code used to
 * succeed and then break the QR list, which renders every thumbnail.
 */
export function qrFits(data: string, style: Pick<QrStyle, "logoUrl" | "errorCorrection">): boolean {
  if (data === "") {
    return false;
  }
  try {
    QRCode.create(data, { errorCorrectionLevel: recommendedErrorLevel(style as QrStyle) });
    return true;
  } catch {
    return false;
  }
}

function isFinder(x: number, y: number, size: number): boolean {
  const inTopLeft = x < FINDER_SIZE && y < FINDER_SIZE;
  const inTopRight = x >= size - FINDER_SIZE && y < FINDER_SIZE;
  const inBottomLeft = x < FINDER_SIZE && y >= size - FINDER_SIZE;
  return inTopLeft || inTopRight || inBottomLeft;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function round(value: number): string {
  return Number(value.toFixed(3)).toString();
}

/**
 * Draws one finder pattern as a ring plus a solid core instead of 49 separate modules.
 * Scanners key off these three squares, so they never get the decorative dot treatment.
 */
function finderPath(
  originX: number,
  originY: number,
  cell: number,
  radius: number,
  color: string,
  background: string,
): string {
  const outer = FINDER_SIZE * cell;
  const inner = 5 * cell;
  const core = 3 * cell;

  return [
    `<rect x="${round(originX)}" y="${round(originY)}" width="${round(outer)}" height="${round(outer)}" rx="${round(radius * 2)}" fill="${color}"/>`,
    `<rect x="${round(originX + cell)}" y="${round(originY + cell)}" width="${round(inner)}" height="${round(inner)}" rx="${round(radius * 1.5)}" fill="${background}"/>`,
    `<rect x="${round(originX + 2 * cell)}" y="${round(originY + 2 * cell)}" width="${round(core)}" height="${round(core)}" rx="${round(radius)}" fill="${color}"/>`,
  ].join("");
}

export type QrSvgOptions = {
  /**
   * Inlined as a data URI for server exports (sharp cannot fetch); the browser preview
   * can pass the plain URL and let the image load normally.
   */
  logoHref?: string | null;
  /** Overrides `style.size`, e.g. a small preview or a large print export. */
  size?: number;
};

type CodeLayer = { modules: string; finders: string; logo: string };

/** Modules, finder patterns and logo for a code `width` wide, drawn from the origin. */
function codeLayer(matrix: Matrix, style: QrStyle, width: number, logoHref: string | null | undefined): CodeLayer {
  const total = matrix.size + style.margin * 2;
  const cell = width / total;
  const offset = style.margin * cell;
  const cornerColor = style.cornerColor ?? style.foreground;

  const modules: string[] = [];

  for (let y = 0; y < matrix.size; y += 1) {
    for (let x = 0; x < matrix.size; x += 1) {
      if (!matrix.get(x, y) || isFinder(x, y, matrix.size)) {
        continue;
      }

      const px = offset + x * cell;
      const py = offset + y * cell;

      if (style.dotStyle === "dots") {
        modules.push(
          `<circle cx="${round(px + cell / 2)}" cy="${round(py + cell / 2)}" r="${round(cell * 0.44)}"/>`,
        );
      } else if (style.dotStyle === "rounded") {
        modules.push(
          `<rect x="${round(px)}" y="${round(py)}" width="${round(cell)}" height="${round(cell)}" rx="${round(cell * 0.3)}"/>`,
        );
      } else {
        // A hairline overlap keeps square modules from showing seams after rasterizing.
        modules.push(
          `<rect x="${round(px)}" y="${round(py)}" width="${round(cell * 1.02)}" height="${round(cell * 1.02)}"/>`,
        );
      }
    }
  }

  const radius = style.dotStyle === "square" ? 0 : cell * 0.6;
  const finders = [
    finderPath(offset, offset, cell, radius, cornerColor, style.background),
    finderPath(
      offset + (matrix.size - FINDER_SIZE) * cell,
      offset,
      cell,
      radius,
      cornerColor,
      style.background,
    ),
    finderPath(
      offset,
      offset + (matrix.size - FINDER_SIZE) * cell,
      cell,
      radius,
      cornerColor,
      style.background,
    ),
  ].join("");

  let logo = "";
  if (logoHref) {
    const logoSize = width * style.logoScale;
    const logoOffset = (width - logoSize) / 2;
    const pad = logoSize * 0.12;
    logo =
      `<rect x="${round(logoOffset - pad)}" y="${round(logoOffset - pad)}" width="${round(logoSize + pad * 2)}" height="${round(logoSize + pad * 2)}" rx="${round(logoSize * 0.18)}" fill="${style.background}"/>` +
      `<image x="${round(logoOffset)}" y="${round(logoOffset)}" width="${round(logoSize)}" height="${round(logoSize)}" href="${escapeXml(logoHref)}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  return { modules: `<g fill="${style.foreground}">${modules.join("")}</g>`, finders, logo };
}

/** Inter first: it is bundled for server-side rasterization (see lib/export-fonts.ts). */
const FONT_FAMILY = "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif";

function captionText(style: QrStyle, centerX: number, top: number, height: number): string {
  return style.caption === ""
    ? ""
    : `<text x="${round(centerX)}" y="${round(top + height * 0.72)}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="${round(height * 0.6)}" fill="${style.foreground}">${escapeXml(style.caption)}</text>`;
}

function labelText(text: string, centerX: number, top: number, height: number, fontSize: number, color: string): string {
  // Baseline sits ~0.35em below the band's midline, which centres cap height visually.
  return `<text x="${round(centerX)}" y="${round(top + height / 2 + fontSize * 0.35)}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="${round(fontSize)}" font-weight="700" fill="${color}">${escapeXml(text)}</text>`;
}

/**
 * A rounded frame with an optional call-to-action label around the code. The whole
 * artwork keeps the requested width (the code shrinks to make room), so previews and
 * exports keep their size; only the height grows. The code itself keeps crisp edges,
 * the frame and text are anti-aliased.
 */
function framedSvg(
  matrix: Matrix,
  style: QrStyle,
  frame: Exclude<QrFrame, "none">,
  width: number,
  logoHref: string | null | undefined,
): string {
  const accent = style.frameColor ?? style.foreground;
  const label = style.frameText;
  const pad = width * 0.04;
  const radius = width * 0.05;
  const labelHeight = label === "" ? 0 : width * 0.12;
  const fontSize = width * 0.052;
  const parts: string[] = [];

  let border: number;
  let inner: number;
  if (frame === "banner") {
    border = width * 0.035;
    inner = width * 0.03;
  } else {
    border = Math.max(1, width * 0.014);
    inner = width * 0.035;
  }
  const codeSize = width - 2 * (pad + border + inner);
  const captionHeight = style.caption === "" ? 0 : Math.round(codeSize * 0.085);
  const codeX = pad + border + inner;
  const codeY = pad + border + inner;
  const contentBottom = codeY + codeSize + captionHeight;
  const cardWidth = width - 2 * pad;
  let height: number;

  if (frame === "banner") {
    // A solid band all round; its bottom edge widens into the label strip.
    const panelHeight = inner * 2 + codeSize + captionHeight;
    const bottom = label === "" ? border : labelHeight;
    const cardHeight = border + panelHeight + bottom;
    height = cardHeight + 2 * pad;
    parts.push(
      `<rect x="${round(pad)}" y="${round(pad)}" width="${round(cardWidth)}" height="${round(cardHeight)}" rx="${round(radius)}" fill="${accent}"/>`,
      `<rect x="${round(pad + border)}" y="${round(pad + border)}" width="${round(cardWidth - 2 * border)}" height="${round(panelHeight)}" rx="${round(radius * 0.6)}" fill="${style.background}"/>`,
    );
    if (label !== "") {
      parts.push(labelText(label, width / 2, pad + border + panelHeight, labelHeight, fontSize, style.background));
    }
  } else {
    // box: label inside the card under the code. bubble: label in a pill below it.
    const labelInside = frame === "box" && label !== "";
    const cardHeight = border + inner + codeSize + captionHeight + (labelInside ? labelHeight : inner) + border;
    parts.push(
      `<rect x="${round(pad + border / 2)}" y="${round(pad + border / 2)}" width="${round(cardWidth - border)}" height="${round(cardHeight - border)}" rx="${round(radius)}" fill="${style.background}" stroke="${accent}" stroke-width="${round(border)}"/>`,
    );
    height = cardHeight + 2 * pad;
    if (labelInside) {
      parts.push(labelText(label, width / 2, contentBottom, labelHeight, fontSize, accent));
    }
    if (frame === "bubble" && label !== "") {
      const gap = width * 0.02;
      const tip = width * 0.035;
      const pillTop = pad + cardHeight + gap + tip;
      const pillWidth = Math.min(cardWidth, Math.max(width * 0.4, label.length * fontSize * 0.62 + fontSize * 2.4));
      const pillX = (width - pillWidth) / 2;
      parts.push(
        `<path d="M${round(width / 2 - tip)} ${round(pillTop + 0.5)} L${round(width / 2)} ${round(pillTop - tip)} L${round(width / 2 + tip)} ${round(pillTop + 0.5)} Z" fill="${accent}"/>`,
        `<rect x="${round(pillX)}" y="${round(pillTop)}" width="${round(pillWidth)}" height="${round(labelHeight)}" rx="${round(labelHeight / 2)}" fill="${accent}"/>`,
        labelText(label, width / 2, pillTop, labelHeight, fontSize, style.background),
      );
      height = pillTop + labelHeight + pad;
    }
  }

  const layer = codeLayer(matrix, style, codeSize, logoHref);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${round(width)}" height="${round(height)}" viewBox="0 0 ${round(width)} ${round(height)}">`,
    `<rect width="${round(width)}" height="${round(height)}" fill="${style.background}"/>`,
    ...parts,
    `<g transform="translate(${round(codeX)} ${round(codeY)})" shape-rendering="crispEdges">${layer.modules}${layer.finders}${layer.logo}</g>`,
    captionText(style, width / 2, codeY + codeSize, captionHeight),
    `</svg>`,
  ].join("");
}

export function buildQrSvg(data: string, rawStyle: QrStyle, options: QrSvgOptions = {}): string {
  // Stored styles are schema-validated hex colors, but this markup is injected with
  // dangerouslySetInnerHTML, so colors are escaped like every other interpolated value.
  // Styles saved before frames existed have no frame fields at all; they render as before.
  const style: QrStyle = {
    ...rawStyle,
    foreground: escapeXml(rawStyle.foreground),
    background: escapeXml(rawStyle.background),
    cornerColor: rawStyle.cornerColor == null ? null : escapeXml(rawStyle.cornerColor),
    frame: QR_FRAMES.includes(rawStyle.frame) ? rawStyle.frame : "none",
    frameText: typeof rawStyle.frameText === "string" ? rawStyle.frameText.trim() : "",
    frameColor: rawStyle.frameColor == null ? null : escapeXml(rawStyle.frameColor),
  };
  const matrix = buildMatrix(data, style);
  const width = options.size ?? style.size;

  if (style.frame !== "none") {
    return framedSvg(matrix, style, style.frame, width, options.logoHref);
  }

  const captionHeight = style.caption === "" ? 0 : Math.round(width * 0.085);
  const height = width + captionHeight;
  const layer = codeLayer(matrix, style, width, options.logoHref);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${round(width)}" height="${round(height)}" viewBox="0 0 ${round(width)} ${round(height)}" shape-rendering="crispEdges">`,
    `<rect width="${round(width)}" height="${round(height)}" fill="${style.background}"/>`,
    layer.modules,
    layer.finders,
    layer.logo,
    captionText(style, width / 2, width, captionHeight),
    `</svg>`,
  ].join("");
}

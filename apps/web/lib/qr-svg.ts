import { recommendedErrorLevel, type QrStyle } from "@short/core";
import QRCode from "qrcode";

/**
 * Isomorphic on purpose: the designer renders the exact same SVG in the browser preview
 * that the export route rasterizes on the server.
 */

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

export function buildQrSvg(data: string, style: QrStyle, options: QrSvgOptions = {}): string {
  const matrix = buildMatrix(data, style);
  const width = options.size ?? style.size;
  const captionHeight = style.caption === "" ? 0 : Math.round(width * 0.085);
  const total = matrix.size + style.margin * 2;
  const cell = width / total;
  const offset = style.margin * cell;
  const cornerColor = style.cornerColor ?? style.foreground;
  const height = width + captionHeight;

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
  if (options.logoHref) {
    const logoSize = width * style.logoScale;
    const logoOffset = (width - logoSize) / 2;
    const pad = logoSize * 0.12;
    logo =
      `<rect x="${round(logoOffset - pad)}" y="${round(logoOffset - pad)}" width="${round(logoSize + pad * 2)}" height="${round(logoSize + pad * 2)}" rx="${round(logoSize * 0.18)}" fill="${style.background}"/>` +
      `<image x="${round(logoOffset)}" y="${round(logoOffset)}" width="${round(logoSize)}" height="${round(logoSize)}" href="${escapeXml(options.logoHref)}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  const caption =
    style.caption === ""
      ? ""
      : `<text x="${round(width / 2)}" y="${round(width + captionHeight * 0.72)}" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${round(captionHeight * 0.6)}" fill="${style.foreground}">${escapeXml(style.caption)}</text>`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${round(width)}" height="${round(height)}" viewBox="0 0 ${round(width)} ${round(height)}" shape-rendering="crispEdges">`,
    `<rect width="${round(width)}" height="${round(height)}" fill="${style.background}"/>`,
    `<g fill="${style.foreground}">${modules.join("")}</g>`,
    finders,
    logo,
    caption,
    `</svg>`,
  ].join("");
}

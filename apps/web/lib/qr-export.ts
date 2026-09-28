import { isPublicHttpUrl, type QrStyle } from "@short/core";
import { getMediaById, MAX_MEDIA_BYTES, parseMediaId } from "./media";
import { parseQrLogoPreset } from "./qr-logo-presets";
import { qrLogoPresetDataUri } from "./qr-logo-svg";
import { buildQrSvg, QR_PDF_DPI } from "./qr-svg";

/** Remote and inline logos: small, they are fetched or decoded per export. */
const MAX_LOGO_BYTES = 1024 * 1024;
/**
 * Raster logos are re-encoded to fit this box before they are inlined. The logo covers
 * at most 30% of the code, so 1024px is sharp even on a 4096px export.
 */
const LOGO_MAX_PX = 1024;
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export class LogoEmbedError extends Error {
  constructor(message = "QR logo could not be embedded") {
    super(message);
    this.name = "LogoEmbedError";
  }
}

type LogoBytes = { bytes: Buffer; type: string };

function toDataUri({ bytes, type }: LogoBytes): string {
  return `data:${type};base64,${bytes.toString("base64")}`;
}

/**
 * The image as something every renderer can draw. The export rasterizer (sharp/librsvg)
 * cannot decode WebP inside an SVG `<image>`: a WebP logo showed in the live preview and
 * was silently missing from the PNG and PDF. Oversized photos also bloated every SVG
 * download. Rasters are therefore bounded and re-encoded to PNG (JPEG stays JPEG);
 * small PNG/JPEG files and SVG artwork pass through untouched.
 */
async function embeddableLogo(logo: LogoBytes): Promise<string | null> {
  if (logo.type === "image/svg+xml") {
    return toDataUri(logo);
  }

  try {
    const { default: sharp } = await import("sharp");
    const image = sharp(logo.bytes, { failOn: "none" });
    const meta = await image.metadata();
    const fits = (meta.width ?? 0) <= LOGO_MAX_PX && (meta.height ?? 0) <= LOGO_MAX_PX;
    const oriented = meta.orientation == null || meta.orientation === 1;
    if (
      (logo.type === "image/png" || logo.type === "image/jpeg") &&
      fits &&
      oriented &&
      logo.bytes.byteLength <= MAX_LOGO_BYTES
    ) {
      return toDataUri(logo);
    }

    const bounded = image
      .rotate()
      .resize({ width: LOGO_MAX_PX, height: LOGO_MAX_PX, fit: "inside", withoutEnlargement: true });
    if (logo.type === "image/jpeg") {
      return toDataUri({ bytes: await bounded.jpeg({ quality: 90 }).toBuffer(), type: "image/jpeg" });
    }
    return toDataUri({ bytes: await bounded.png().toBuffer(), type: "image/png" });
  } catch (error) {
    console.error("failed to prepare QR logo", error);
    return null;
  }
}

async function fetchRemoteLogo(url: string): Promise<LogoBytes | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  // Legacy remote logos are fetched server-side: refuse loopback, private, link-local
  // and internal-only hosts so a stored logo URL cannot probe the panel's network.
  if (parsed.protocol !== "https:" || !isPublicHttpUrl(parsed.toString())) {
    return null;
  }

  try {
    const response = await fetch(parsed, { redirect: "error", signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      return null;
    }

    const type = (response.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
    if (!ALLOWED_LOGO_TYPES.includes(type)) {
      return null;
    }
    // Refuse oversized bodies before buffering them.
    if (Number(response.headers.get("content-length") ?? 0) > MAX_LOGO_BYTES) {
      return null;
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > MAX_LOGO_BYTES) {
      return null;
    }

    return { bytes, type };
  } catch (error) {
    console.error("failed to fetch QR logo", error);
    return null;
  }
}

function parseDataUri(value: string): LogoBytes | null {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i.exec(value);
  if (!match?.[1] || !match[2] || !ALLOWED_LOGO_TYPES.includes(match[1].toLowerCase())) {
    return null;
  }
  return { type: match[1].toLowerCase(), bytes: Buffer.from(match[2], "base64") };
}

/**
 * Logos are inlined so preview and export share the same bytes. Built-in presets are
 * rendered in-process, first-party media is read from Postgres, and leftover HTTPS
 * URLs stay behind the SSRF allowlist.
 */
export async function fetchLogoDataUri(url: string | null): Promise<string | null> {
  if (!url) {
    return null;
  }

  if (url.startsWith("data:image/")) {
    const inline = url.length <= MAX_LOGO_BYTES * 1.4 ? parseDataUri(url) : null;
    return inline ? embeddableLogo(inline) : null;
  }

  const preset = parseQrLogoPreset(url);
  if (preset) {
    return qrLogoPresetDataUri(preset.id);
  }

  const mediaId = parseMediaId(url);
  if (mediaId) {
    const row = await getMediaById(mediaId);
    // Uploads are capped at MAX_MEDIA_BYTES; the old 1 MB cap here made every logo
    // between 1 and 4 MB fail its download even though the upload had been accepted.
    if (!row || row.bytes.byteLength > MAX_MEDIA_BYTES) {
      return null;
    }
    return embeddableLogo({ bytes: row.bytes, type: row.contentType });
  }

  const remote = await fetchRemoteLogo(url);
  return remote ? embeddableLogo(remote) : null;
}

/** SVG with the logo inlined, ready to be written to disk or rasterized. */
export async function renderQrSvg(
  payload: string,
  style: QrStyle,
  size?: number,
): Promise<string> {
  const logoHref = await fetchLogoDataUri(style.logoUrl);
  if (style.logoUrl && !logoHref) {
    throw new LogoEmbedError();
  }
  return buildQrSvg(payload, style, { logoHref, size });
}

/** The root element's declared width, i.e. the size the SVG was built at. */
function declaredWidth(svg: string): number | null {
  const match = /^<svg\b[^>]*?\swidth="([\d.]+)"/.exec(svg);
  const value = match?.[1] ? Number(match[1]) : Number.NaN;
  return Number.isFinite(value) && value > 0 ? value : null;
}

export async function renderQrPng(svg: string, width: number): Promise<Buffer> {
  const { default: sharp } = await import("sharp");
  // Rasterize at twice the target width, then downsample: smooth text and frame curves.
  // A fixed 384 dpi rendered a 2048px code at ~11,000px and a 4096px one past libvips'
  // pixel limit ("Input image exceeds pixel limit"), so large downloads failed.
  const source = declaredWidth(svg) ?? width;
  const density = Math.min(384, Math.max(36, (72 * 2 * width) / source));
  return sharp(Buffer.from(svg), { density }).resize({ width }).png().toBuffer();
}

export async function renderQrPdf(svg: string, width: number): Promise<Buffer> {
  const [{ PDFDocument }, png] = await Promise.all([import("pdf-lib"), renderQrPng(svg, width)]);

  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(png);
  // Pixels were mapped 1:1 to points, so a 2048px code came out as a 72 cm page. At
  // 300 dpi the page is the physical size a print shop expects from that many pixels.
  const toPoints = (pixels: number) => (pixels * 72) / QR_PDF_DPI;
  const pageWidth = toPoints(image.width);
  const pageHeight = toPoints(image.height);
  const page = pdf.addPage([pageWidth, pageHeight]);
  page.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight });

  return Buffer.from(await pdf.save());
}

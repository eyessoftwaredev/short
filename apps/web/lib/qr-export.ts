import type { QrStyle } from "@short/core";
import { getMediaById, mediaToDataUri, parseMediaId } from "./media";
import { buildQrSvg } from "./qr-svg";

const MAX_LOGO_BYTES = 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export class LogoEmbedError extends Error {
  constructor(message = "QR logo could not be embedded") {
    super(message);
    this.name = "LogoEmbedError";
  }
}

async function fetchRemoteLogo(url: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") {
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

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_LOGO_BYTES) {
      return null;
    }

    return `data:${type};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error("failed to fetch QR logo", error);
    return null;
  }
}

/**
 * Logos are inlined so preview and export share the same bytes. First-party media
 * is read from Postgres; leftover HTTPS URLs stay behind the SSRF allowlist.
 */
export async function fetchLogoDataUri(url: string | null): Promise<string | null> {
  if (!url) {
    return null;
  }

  if (url.startsWith("data:image/")) {
    return url.length <= MAX_LOGO_BYTES ? url : null;
  }

  const mediaId = parseMediaId(url);
  if (mediaId) {
    const row = await getMediaById(mediaId);
    if (!row || row.bytes.byteLength > MAX_LOGO_BYTES) {
      return null;
    }
    return mediaToDataUri(row);
  }

  return fetchRemoteLogo(url);
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

export async function renderQrPng(svg: string, width: number): Promise<Buffer> {
  const { default: sharp } = await import("sharp");
  return sharp(Buffer.from(svg), { density: 384 }).resize({ width }).png().toBuffer();
}

export async function renderQrPdf(svg: string, width: number): Promise<Buffer> {
  const [{ PDFDocument }, png] = await Promise.all([import("pdf-lib"), renderQrPng(svg, width)]);

  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(png);
  const page = pdf.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });

  return Buffer.from(await pdf.save());
}

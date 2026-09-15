import type { QrStyle } from "@short/core";
import { buildQrSvg } from "./qr-svg";

const MAX_LOGO_BYTES = 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

/**
 * Logos are fetched server-side, which makes this an SSRF surface: https only, no
 * redirects, a short timeout, an image content-type allowlist and a hard size cap.
 */
export async function fetchLogoDataUri(url: string | null): Promise<string | null> {
  if (!url) {
    return null;
  }

  if (url.startsWith("data:image/")) {
    return url.length <= MAX_LOGO_BYTES ? url : null;
  }

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

/** SVG with the logo inlined, ready to be written to disk or rasterized. */
export async function renderQrSvg(
  payload: string,
  style: QrStyle,
  size?: number,
): Promise<string> {
  const logoHref = await fetchLogoDataUri(style.logoUrl);
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

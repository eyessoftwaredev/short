import type { PlatformAssetKind } from "@short/db";
import sharp from "sharp";

const RASTER_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const PLATE_DELTA = 4;
const CLEAR_ALPHA = 16;

type KnockoutResult = {
  bytes: Buffer;
  contentType: string;
};

type DeliverFormat = "avif" | "webp" | "png";

type DeliverResult = {
  bytes: Buffer;
  contentType: string;
  etag: string;
};

function isPlatePixel(data: Buffer, index: number, cr: number, cg: number, cb: number): boolean {
  return (
    Math.abs(data[index]! - cr) <= PLATE_DELTA &&
    Math.abs(data[index + 1]! - cg) <= PLATE_DELTA &&
    Math.abs(data[index + 2]! - cb) <= PLATE_DELTA
  );
}

function floodClearPlate(data: Buffer, width: number, height: number): boolean {
  const cr = data[0]!;
  const cg = data[1]!;
  const cb = data[2]!;
  const luma = (cr + cg + cb) / 3;
  if (luma >= 48 && luma <= 230) {
    return false;
  }

  const seen = new Uint8Array(width * height);
  const stack = [0, width - 1, (height - 1) * width, height * width - 1];
  for (const start of stack) {
    seen[start] = 1;
  }

  let cleared = 0;
  while (stack.length > 0) {
    const i = stack.pop()!;
    const offset = i * 4;
    if (!isPlatePixel(data, offset, cr, cg, cb)) {
      continue;
    }
    data[offset + 3] = 0;
    cleared += 1;
    const x = i % width;
    const y = (i - x) / width;
    if (x > 0 && seen[i - 1] === 0) {
      seen[i - 1] = 1;
      stack.push(i - 1);
    }
    if (x + 1 < width && seen[i + 1] === 0) {
      seen[i + 1] = 1;
      stack.push(i + 1);
    }
    if (y > 0 && seen[i - width] === 0) {
      seen[i - width] = 1;
      stack.push(i - width);
    }
    if (y + 1 < height && seen[i + width] === 0) {
      seen[i + width] = 1;
      stack.push(i + width);
    }
  }

  return cleared > 0;
}

function hasTransparency(data: Buffer): boolean {
  for (let i = 3; i < data.length; i += 4) {
    if (data[i]! < CLEAR_ALPHA) {
      return true;
    }
  }
  return false;
}

function pickDeliverFormat(accept: string): DeliverFormat {
  if (accept.includes("image/avif")) {
    return "avif";
  }
  if (accept.includes("image/webp")) {
    return "webp";
  }
  return "png";
}

function assetResize(kind: PlatformAssetKind): { width?: number; height?: number } {
  switch (kind) {
    case "logo":
    case "logo_dark":
    case "favicon":
      return { width: 64, height: 64 };
    case "wordmark":
    case "wordmark_dark":
      return { width: 176 };
    case "og":
      return { width: 1200 };
    default:
      return {};
  }
}

/** Drops a flattened near-black or near-white plate so wordmarks stay transparent. */
export async function knockoutBrandPlate(
  bytes: Buffer,
  contentType: string,
): Promise<KnockoutResult> {
  if (!RASTER_TYPES.has(contentType)) {
    return { bytes, contentType };
  }

  try {
    const { data, info } = await sharp(bytes)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (info.channels !== 4) {
      return { bytes, contentType };
    }
    if (hasTransparency(data)) {
      return { bytes, contentType };
    }
    if (!floodClearPlate(data, info.width, info.height)) {
      return { bytes, contentType };
    }
    const png = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toBuffer();
    return { bytes: png, contentType: "image/png" };
  } catch {
    return { bytes, contentType };
  }
}

export async function deliverBrandAsset(
  bytes: Buffer,
  kind: PlatformAssetKind,
  accept: string,
  updatedAt: Date,
): Promise<DeliverResult> {
  const format = pickDeliverFormat(accept);
  const resize = assetResize(kind);
  const etag = `"${kind}-${updatedAt.getTime()}-${format}-${resize.width ?? "auto"}x${resize.height ?? "auto"}"`;

  try {
    let pipeline = sharp(bytes);
    if (resize.width || resize.height) {
      pipeline = pipeline.resize({
        width: resize.width,
        height: resize.height,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    if (format === "avif") {
      const avif = await pipeline.avif({ quality: 72, effort: 4 }).toBuffer();
      return { bytes: avif, contentType: "image/avif", etag };
    }
    if (format === "webp") {
      const webp = await pipeline.webp({ quality: 82, effort: 4 }).toBuffer();
      return { bytes: webp, contentType: "image/webp", etag };
    }

    const png = await pipeline.png({ compressionLevel: 9 }).toBuffer();
    return { bytes: png, contentType: "image/png", etag };
  } catch {
    return { bytes, contentType: "image/png", etag };
  }
}

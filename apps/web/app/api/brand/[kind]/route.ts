import { NextResponse } from "next/server";
import { brandInitial, getPlatformAsset, getPlatformBrand, isPlatformAssetKind } from "@/lib/brand";
import { readDeliverCache, writeDeliverCache } from "@/lib/brand-deliver-cache";
import { deliverBrandAsset, knockoutBrandPlate } from "@/lib/brand-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fallbackSvg(initial: string): Uint8Array {
  const safe = initial.replace(/[^A-Za-z0-9]/g, "").slice(0, 1) || "S";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#111"/><text x="32" y="42" text-anchor="middle" font-family="ui-monospace,monospace" font-size="32" font-weight="600" fill="#fff">${safe}</text></svg>`;
  return new TextEncoder().encode(svg);
}

function toBodyInit(bytes: Uint8Array): BodyInit {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

const CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800";

export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isPlatformAssetKind(kind)) {
    return NextResponse.json({ error: "unknown brand asset" }, { status: 404 });
  }

  const asset =
    (await getPlatformAsset(kind)) ??
    (kind === "logo_dark" ? await getPlatformAsset("logo") : null);
  if (asset) {
    const accept = request.headers.get("accept") ?? "";
    const format = accept.includes("image/avif")
      ? "avif"
      : accept.includes("image/webp")
        ? "webp"
        : "png";
    const cached = readDeliverCache(kind, asset.updatedAt, format);
    const delivered =
      cached ??
      (await (async () => {
        const cleaned = await knockoutBrandPlate(Buffer.from(asset.bytes), asset.contentType);
        const next = await deliverBrandAsset(cleaned.bytes, kind, accept, asset.updatedAt);
        writeDeliverCache(kind, asset.updatedAt, format, next);
        return next;
      })());
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch === delivered.etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          "cache-control": CACHE_CONTROL,
          etag: delivered.etag,
          "last-modified": asset.updatedAt.toUTCString(),
        },
      });
    }

    return new NextResponse(toBodyInit(delivered.bytes), {
      headers: {
        "content-type": delivered.contentType,
        "cache-control": CACHE_CONTROL,
        etag: delivered.etag,
        "last-modified": asset.updatedAt.toUTCString(),
      },
    });
  }

  if (kind === "wordmark" || kind === "wordmark_dark") {
    return new NextResponse(null, { status: 404 });
  }

  const brand = await getPlatformBrand();
  return new NextResponse(toBodyInit(fallbackSvg(brandInitial(brand.name))), {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=60",
    },
  });
}

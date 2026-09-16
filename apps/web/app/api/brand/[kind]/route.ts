import { NextResponse } from "next/server";
import { brandInitial, getPlatformAsset, getPlatformBrand, isPlatformAssetKind } from "@/lib/brand";

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

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isPlatformAssetKind(kind)) {
    return NextResponse.json({ error: "unknown brand asset" }, { status: 404 });
  }

  const asset = await getPlatformAsset(kind);
  if (asset) {
    return new NextResponse(toBodyInit(asset.bytes), {
      headers: {
        "content-type": asset.contentType,
        "cache-control": "public, max-age=300, stale-while-revalidate=86400",
        "last-modified": asset.updatedAt.toUTCString(),
      },
    });
  }

  const brand = await getPlatformBrand();
  return new NextResponse(toBodyInit(fallbackSvg(brandInitial(brand.name))), {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=60",
    },
  });
}

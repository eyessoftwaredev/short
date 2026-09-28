import { NextResponse } from "next/server";
import { MEDIA_RESPONSE_HEADERS } from "@/lib/media";
import { getQrLogoPresetSvg } from "@/lib/qr-logo-svg";

export const runtime = "nodejs";

/**
 * Built-in QR logo artwork (see lib/qr-logo-presets.ts). Public on purpose: it is the
 * same static catalogue for every workspace and holds nothing tenant-specific, and the
 * designer preview loads it as a plain `<image href>`. Exports never come through here;
 * they inline the SVG in-process.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ preset: string }> },
): Promise<NextResponse> {
  const { preset } = await params;
  const svg = getQrLogoPresetSvg(preset);
  if (!svg) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return new NextResponse(svg, {
    headers: {
      ...MEDIA_RESPONSE_HEADERS,
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

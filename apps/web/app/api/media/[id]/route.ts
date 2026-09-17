import { NextResponse } from "next/server";
import { getMediaById } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toBodyInit(bytes: Uint8Array): BodyInit {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const asset = await getMediaById(id);
  if (!asset) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return new NextResponse(toBodyInit(asset.bytes), {
    headers: {
      "content-type": asset.contentType,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

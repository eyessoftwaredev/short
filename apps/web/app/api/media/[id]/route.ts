import { NextResponse } from "next/server";
import { deleteWorkspaceMedia, getMediaById } from "@/lib/media";
import { requireWorkspace } from "@/lib/session";

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

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireWorkspace();
    const { id } = await params;
    if (!UUID.test(id)) {
      return NextResponse.json({ error: { code: "not_found", message: "Not found" } }, { status: 404 });
    }

    const result = await deleteWorkspaceMedia(context.workspace.id, id);
    if (!result.deleted) {
      if (result.reason === "not_found") {
        return NextResponse.json({ error: { code: "not_found", message: "Not found" } }, { status: 404 });
      }
      return NextResponse.json(
        { error: { code: "media_in_use", message: "Image is still in use" } },
        { status: 409 },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: { code: "unauthorized", message: "Unauthorized" } }, { status: 401 });
  }
}

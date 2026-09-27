import { NextResponse } from "next/server";
import {
  listWorkspaceMedia,
  MAX_MEDIA_BYTES,
  uploadWorkspaceMedia,
} from "@/lib/media";
import { rateLimit } from "@/lib/redis";
import { requireWorkspace } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const context = await requireWorkspace();
    const url = new URL(request.url);
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(url.searchParams.get("pageSize") ?? "48", 10) || 48),
    );

    const result = await listWorkspaceMedia(context.workspace.id, page, pageSize);
    return NextResponse.json({
      data: result.items,
      pagination: { page, pageSize, total: result.total },
    });
  } catch {
    return NextResponse.json({ error: { code: "unauthorized", message: "Unauthorized" } }, { status: 401 });
  }
}

/** Multipart framing on top of the file itself. */
const MAX_UPLOAD_BODY_BYTES = MAX_MEDIA_BYTES + 64 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const context = await requireWorkspace();

    // Reject declared-oversized bodies before `formData()` buffers them into memory.
    const declared = Number(request.headers.get("content-length") ?? "0");
    if (declared > MAX_UPLOAD_BODY_BYTES) {
      return NextResponse.json(
        { error: { code: "media_size", message: "File too large" } },
        { status: 413 },
      );
    }

    // Uploads are stored in Postgres, so a runaway client is capped per workspace.
    const limit = await rateLimit(`media-upload:${context.workspace.id}`, 120, 3600);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: { code: "rate_limited", message: "Too many uploads, try again later" } },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { code: "media_missing", message: "No file provided" } },
        { status: 400 },
      );
    }

    const uploaded = await uploadWorkspaceMedia({
      workspaceId: context.workspace.id,
      uploadedBy: context.user.id,
      file,
    });

    return NextResponse.json({ data: uploaded }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "media_type") {
        return NextResponse.json(
          { error: { code: "media_type", message: "Unsupported file type" } },
          { status: 400 },
        );
      }
      if (error.message === "media_size") {
        return NextResponse.json(
          { error: { code: "media_size", message: "File too large" } },
          { status: 400 },
        );
      }
      if (error.message === "media_missing") {
        return NextResponse.json(
          { error: { code: "media_missing", message: "No file provided" } },
          { status: 400 },
        );
      }
    }
    return NextResponse.json(
      { error: { code: "media_failed", message: "Upload failed" } },
      { status: 500 },
    );
  }
}

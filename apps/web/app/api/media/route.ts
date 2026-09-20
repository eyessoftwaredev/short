import { NextResponse } from "next/server";
import {
  listWorkspaceMedia,
  uploadWorkspaceMedia,
} from "@/lib/media";
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

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const context = await requireWorkspace();
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

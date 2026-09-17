import { QR_EXPORT_FORMATS, type QrExportFormat } from "@short/core";
import { NextResponse, type NextRequest } from "next/server";
import { getQrCode, qrPayload } from "@/lib/qr-codes";
import { LogoEmbedError, renderQrPdf, renderQrPng, renderQrSvg } from "@/lib/qr-export";
import { getSessionContext } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<QrExportFormat, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  pdf: "application/pdf",
};

function parseFormat(value: string | null): QrExportFormat {
  return QR_EXPORT_FORMATS.includes(value as QrExportFormat) ? (value as QrExportFormat) : "png";
}

function safeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9-_ ]/g, "").trim();
  return cleaned === "" ? "qr-code" : cleaned.replace(/\s+/g, "-").toLowerCase();
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getSessionContext();
  if (!context?.workspace) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const record = await getQrCode(context.workspace.id, id);
  if (!record) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const format = parseFormat(request.nextUrl.searchParams.get("format"));
  const requested = Number(request.nextUrl.searchParams.get("size") ?? record.style.size);
  const size = Number.isFinite(requested) ? Math.min(Math.max(requested, 128), 4096) : 512;

  try {
    const svg = await renderQrSvg(qrPayload(record), record.style, size);
    const body =
      format === "svg"
        ? svg
        : format === "png"
          ? await renderQrPng(svg, size)
          : await renderQrPdf(svg, size);

    return new NextResponse(body as BodyInit, {
      headers: {
        "content-type": CONTENT_TYPES[format],
        "content-disposition": `attachment; filename="${safeFileName(record.name)}.${format}"`,
        "cache-control": "private, max-age=0, no-store",
      },
    });
  } catch (error) {
    if (error instanceof LogoEmbedError) {
      return NextResponse.json({ error: "logo_embed_failed" }, { status: 422 });
    }
    console.error("failed to render QR export", error);
    return NextResponse.json({ error: "render failed" }, { status: 500 });
  }
}

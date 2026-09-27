import { NextResponse, type NextRequest } from "next/server";
import { createLandingShortLink, type LandingShortenResult } from "@/lib/landing-shorten";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  url?: unknown;
};

export async function POST(request: NextRequest): Promise<NextResponse<LandingShortenResult>> {
  // JSON-only: a cross-site HTML form cannot send this content type without a CORS
  // preflight, so a third-party page cannot mint links under a visitor's session.
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 415 });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const raw = typeof payload?.url === "string" ? payload.url : "";
  try {
    const result = await createLandingShortLink(raw);
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (error) {
    console.error("landing shorten route failed", error);
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}

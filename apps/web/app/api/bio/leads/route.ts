import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createBioLead, getLiveBiopageById } from "@/lib/biopages";
import { rateLimit } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  biopageId: z.string().uuid(),
  blockId: z.string().min(1),
  email: z.string().trim().email().max(254),
});

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const ip = clientIp(request);
  const limited = await rateLimit(`bio-lead:${ip}`, 8, 3600);
  if (!limited.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const page = await getLiveBiopageById(parsed.data.biopageId);
  const block = page?.blocks.find(
    (item) => item.id === parsed.data.blockId && item.type === "form" && item.mode === "email",
  );
  if (!page || !block) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 32);
  await createBioLead({
    biopageId: page.id,
    blockId: block.id,
    email: parsed.data.email.toLowerCase(),
    ipHash,
  });

  return NextResponse.json({ ok: true });
}

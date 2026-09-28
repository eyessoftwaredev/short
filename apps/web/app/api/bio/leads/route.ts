import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { clientIp } from "@/lib/abuse";
import { bioLeadExists, createBioLead, getLiveBiopageById } from "@/lib/biopages";
import { rateLimit } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bio pages live on customer hostnames, so the lead form always posts cross-origin. */
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
} as const;

function reply(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const bodySchema = z.object({
  biopageId: z.string().uuid(),
  blockId: z.string().min(1).max(256),
  email: z.string().trim().email().max(254),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply({ error: "invalid" }, 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return reply({ error: "invalid" }, 400);
  }

  const ip = clientIp(request.headers) ?? "unknown";
  const limited = await rateLimit(`bio-lead:${ip}`, 8, 3600);
  if (!limited.allowed) {
    return reply({ error: "rate_limited" }, 429);
  }

  const page = await getLiveBiopageById(parsed.data.biopageId);
  const block = page?.blocks.find(
    (item) => item.id === parsed.data.blockId && item.type === "form" && item.mode === "email",
  );
  if (!page || !block) {
    return reply({ error: "not_found" }, 404);
  }

  const email = parsed.data.email.toLowerCase();
  // A repeat sign-up is answered like a new one (no enumeration of who is on the list),
  // but it is not stored twice.
  if (await bioLeadExists(page.id, email)) {
    return reply({ ok: true });
  }

  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 32);
  await createBioLead({
    biopageId: page.id,
    blockId: block.id,
    email,
    ipHash,
  });

  return reply({ ok: true });
}

import { applyMigrations } from "@short/db";
import { NextResponse, type NextRequest } from "next/server";
import { hasBearerSecret } from "@/lib/api-auth";
import { serverEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Applies pending Drizzle migrations. Trigger after deploy with CRON_SECRET (required;
 * the endpoint stays closed when it is unset):
 * curl -X POST http://127.0.0.1:3000/api/cron/migrate -H "Authorization: Bearer …"
 */
export async function POST(request: NextRequest) {
  const env = serverEnv();
  // Schema changes never fall back to INTERNAL_TOKEN: that secret also lives in the edge
  // worker, and a leak there must not be enough to drive migrations.
  if (!hasBearerSecret(request.headers, env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await applyMigrations(env.DATABASE_URL);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("migrate failed", error);
    return NextResponse.json({ error: "migrate_failed" }, { status: 500 });
  }
}

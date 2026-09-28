import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { DIGEST_BATCH_SIZE, runWeeklyDigest } from "@/lib/digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Weekly digest email to owners/admins of every workspace with links and the digest on.
 * Idempotent per ISO week (`workspace_settings.digest_sent_for`): schedule it hourly on
 * Mondays (e.g. `0 6-12 * * 1`, bearer CRON_SECRET) and each run picks up where the
 * last stopped; `more: true` in the response means another call has work to do.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request.headers)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const requested = Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(requested) ? requested : DIGEST_BATCH_SIZE;

  try {
    return NextResponse.json(await runWeeklyDigest({ limit }));
  } catch (error) {
    console.error("digest cron failed", error);
    return NextResponse.json({ error: "digest_failed" }, { status: 500 });
  }
}

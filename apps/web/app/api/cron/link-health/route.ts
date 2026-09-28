import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { HEALTH_BATCH_SIZE, runHealthChecks } from "@/lib/link-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Checks the destinations of up to `?limit=` (default 200) active links not checked in
 * the last 6 hours, oldest first, 10 at a time. Links failing twice in a row turn
 * `broken`, fire `link.broken` webhooks and trigger one alert email per workspace.
 * Schedule every 15 minutes (bearer CRON_SECRET); a run stops starting new probes after
 * ~100 s and releases what it did not reach.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request.headers)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const requested = Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(requested) ? requested : HEALTH_BATCH_SIZE;

  try {
    return NextResponse.json(await runHealthChecks({ limit }));
  } catch (error) {
    console.error("link-health cron failed", error);
    return NextResponse.json({ error: "link_health_failed" }, { status: 500 });
  }
}

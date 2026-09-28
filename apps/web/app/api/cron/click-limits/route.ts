import { NextResponse, type NextRequest } from "next/server";
import { enforceClickLimits } from "@/lib/click-limit-enforcer";
import { isAuthorizedCron } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Flags links whose lifetime clicks reached `max_clicks` and pushes `limitReached` to KV,
 * after which the edge treats them as expired. Enforcement is only as tight as the
 * schedule: run it every 5 minutes (bearer CRON_SECRET).
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request.headers)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await enforceClickLimits();
    return NextResponse.json(result);
  } catch (error) {
    console.error("click-limit cron failed", error);
    return NextResponse.json({ error: "click_limits_failed" }, { status: 500 });
  }
}

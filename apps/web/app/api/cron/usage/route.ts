import { NextResponse, type NextRequest } from "next/server";
import { getDb, organization } from "@short/db";
import { finalizeDueAccountDeletions } from "@/lib/account-deletion";
import { syncClickUsage } from "@/lib/billing";
import { serverEnv } from "@/lib/env";
import { resyncWorkspaceLinks } from "@/lib/links";
import { currentPeriod } from "@/lib/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Rolls click totals from ClickHouse into `usage_counters` so quota checks stay cheap.
 * Schedule it hourly (Coolify cron or an external pinger) with the CRON_SECRET bearer.
 */
export async function POST(request: NextRequest) {
  const env = serverEnv();
  const expected = env.CRON_SECRET ?? env.INTERNAL_TOKEN;

  if (request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const period = currentPeriod();
  const workspaces = await getDb().select({ id: organization.id }).from(organization);

  let synced = 0;
  const failures: string[] = [];

  for (const workspace of workspaces) {
    try {
      await syncClickUsage(workspace.id, period);
      await resyncWorkspaceLinks(workspace.id);
      synced += 1;
    } catch (error) {
      console.error("usage sync failed", workspace.id, error);
      failures.push(workspace.id);
    }
  }

  const deactivated = await finalizeDueAccountDeletions();

  return NextResponse.json({ period, synced, failures: failures.length, deactivated });
}

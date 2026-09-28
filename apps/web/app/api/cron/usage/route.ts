import { NextResponse, type NextRequest } from "next/server";
import { getDb, organization } from "@short/db";
import { finalizeDueAccountDeletions } from "@/lib/account-deletion";
import { syncClickUsage } from "@/lib/billing";
import { refreshPendingDomains } from "@/lib/domains";
import { hasBearerSecret } from "@/lib/api-auth";
import { serverEnv } from "@/lib/env";
import { resyncWorkspaceLinks } from "@/lib/links";
import { currentPeriod, workspaceOverClickQuota } from "@/lib/quota";
import { cacheGet, cacheSet } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Longer than a billing month, so a month's state is still known when it rolls over. */
const QUOTA_STATE_TTL_SECONDS = 40 * 24 * 60 * 60;

/**
 * Link KV records carry the workspace's over-quota flag, so they must be rewritten when
 * it flips — and only then. Rewriting every link every hour cost links × 24 KV writes a
 * day, against a free-plan budget of 1,000 writes for the whole account. Every panel
 * write already stamps the current state; an unknown previous state (first run, Redis
 * flushed) therefore only needs a resync when the workspace is over quota.
 */
async function quotaStateChanged(workspaceId: string): Promise<boolean> {
  const over = await workspaceOverClickQuota(workspaceId);
  const key = `kv-quota-state:${workspaceId}`;
  const previous = await cacheGet<boolean>(key);
  await cacheSet(key, over, QUOTA_STATE_TTL_SECONDS);
  return previous === null ? over : previous !== over;
}

/**
 * Rolls click totals from ClickHouse into `usage_counters` so quota checks stay cheap,
 * and pushes a changed over-quota flag to the edge. Scheduled hourly in Coolify with the
 * CRON_SECRET bearer.
 */
export async function POST(request: NextRequest) {
  const env = serverEnv();
  const expected = env.CRON_SECRET ?? env.INTERNAL_TOKEN;

  if (!hasBearerSecret(request.headers, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const period = currentPeriod();
  const workspaces = await getDb().select({ id: organization.id }).from(organization);

  let synced = 0;
  let resynced = 0;
  const failures: string[] = [];

  for (const workspace of workspaces) {
    try {
      await syncClickUsage(workspace.id, period);
      if (await quotaStateChanged(workspace.id)) {
        await resyncWorkspaceLinks(workspace.id);
        resynced += 1;
      }
      synced += 1;
    } catch (error) {
      console.error("usage sync failed", workspace.id, error);
      failures.push(workspace.id);
    }
  }

  const deactivated = await finalizeDueAccountDeletions();

  // Domains otherwise only advance (and fire `domain.verified`) while someone has
  // their setup page or the domains list open.
  let domainsRefreshed = 0;
  try {
    domainsRefreshed = await refreshPendingDomains({ limit: 50 });
  } catch (error) {
    console.error("pending domain refresh failed", error);
  }

  return NextResponse.json({
    period,
    synced,
    resynced,
    failures: failures.length,
    deactivated,
    domainsRefreshed,
  });
}

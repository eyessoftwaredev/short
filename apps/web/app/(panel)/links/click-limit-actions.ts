"use server";

import { z } from "zod";
import { fail, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { clickTotalsFor } from "@/lib/click-limit-enforcer";
import { requireWorkspace } from "@/lib/session";

const idsSchema = z.array(z.string().uuid()).min(1).max(200);

/**
 * Lifetime human clicks + QR scans per link id (bots excluded), for click-limit progress
 * in client components. Ids from other workspaces are dropped. Server components can
 * call `loadLinkClickTotals` / `getClickLimitProgress` directly instead.
 *
 * Errors: `validation`, `analytics_unavailable` (ClickHouse unreachable).
 */
export async function getLinkClickTotalsAction(linkIds: string[]): Promise<ActionResult<Record<string, number>>> {
  try {
    const context = await requireWorkspace();
    const parsed = idsSchema.safeParse(linkIds);
    if (!parsed.success) {
      return fail("validation");
    }
    try {
      return ok(await clickTotalsFor(context.workspace.id, parsed.data));
    } catch (error) {
      console.error("click totals failed", error);
      return fail("analytics_unavailable");
    }
  } catch (error) {
    return toActionError(error);
  }
}

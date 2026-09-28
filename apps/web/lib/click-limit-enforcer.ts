import { getLinkClickTotals } from "@short/analytics";
import {
  and,
  asc,
  domains,
  eq,
  getDb,
  gt,
  inArray,
  isNotNull,
  isNull,
  links,
  lte,
} from "@short/db";
import { putLinkRecords } from "./kv";
import { toKvRecord } from "./links";

/** Links read from Postgres per page; each page is one ClickHouse query. */
const PAGE_SIZE = 1000;

export type ClickLimitRunResult = {
  /** Capped links still open that were compared against their totals. */
  checked: number;
  /** Links flagged as having reached their limit in this run. */
  reached: number;
};

/**
 * `/api/cron/click-limits`: flags every open, capped link whose lifetime total (from the
 * ClickHouse `link_daily` rollup) reached `max_clicks`, and rewrites its KV record with
 * `limitReached` so the edge treats it as expired. Approximate by design: traffic that
 * arrives between two runs (plus the ingest delay) can push a link past its cap.
 *
 * Throws when ClickHouse is unreachable, so the cron reports a failure instead of
 * silently treating every link as unused.
 */
export async function enforceClickLimits(): Promise<ClickLimitRunResult> {
  const db = getDb();
  let checked = 0;
  let reached = 0;
  let cursor: string | null = null;

  for (;;) {
    const page: { id: string; workspaceId: string; maxClicks: number | null }[] = await db
      .select({ id: links.id, workspaceId: links.workspaceId, maxClicks: links.maxClicks })
      .from(links)
      .where(
        and(
          isNotNull(links.maxClicks),
          isNull(links.clickLimitReachedAt),
          cursor ? gt(links.id, cursor) : undefined,
        ),
      )
      .orderBy(asc(links.id))
      .limit(PAGE_SIZE);
    if (page.length === 0) {
      break;
    }
    cursor = page[page.length - 1]?.id ?? null;
    checked += page.length;

    const totals = await getLinkClickTotals(
      [...new Set(page.map((row) => row.workspaceId))],
      page.map((row) => row.id),
    );

    for (const row of page) {
      const total = totals.get(row.id) ?? 0;
      if (row.maxClicks == null || total < row.maxClicks) {
        continue;
      }
      // Re-checked in the UPDATE: the owner may have raised or removed the cap since the
      // page was read, and a concurrent run may already have closed the link.
      const [updated] = await db
        .update(links)
        .set({ clickLimitReachedAt: new Date() })
        .where(
          and(
            eq(links.id, row.id),
            isNull(links.clickLimitReachedAt),
            isNotNull(links.maxClicks),
            lte(links.maxClicks, total),
          ),
        )
        .returning();
      if (!updated) {
        continue;
      }
      const [domain] = await db
        .select({ hostname: domains.hostname })
        .from(domains)
        .where(eq(domains.id, updated.domainId))
        .limit(1);
      if (domain) {
        await putLinkRecords([toKvRecord(updated, domain.hostname)]);
      }
      reached += 1;
    }

    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  return { checked, reached };
}

/** Lifetime totals for the given links, keyed by id (0 for links without traffic). */
export async function clickTotalsFor(
  workspaceId: string,
  linkIds: string[],
): Promise<Record<string, number>> {
  const ids = [...new Set(linkIds)];
  if (ids.length === 0) {
    return {};
  }
  // Only ids that really belong to the workspace are sent to ClickHouse.
  const owned = await getDb()
    .select({ id: links.id })
    .from(links)
    .where(and(eq(links.workspaceId, workspaceId), inArray(links.id, ids)));
  const totals = await getLinkClickTotals(
    [workspaceId],
    owned.map((row) => row.id),
  );
  return Object.fromEntries(owned.map((row) => [row.id, totals.get(row.id) ?? 0]));
}

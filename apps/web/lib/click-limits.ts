import type { LinkRow } from "@short/db";
import { loadLinkClickTotals } from "./analytics";

/**
 * Click limits are enforced approximately: `/api/cron/click-limits` compares lifetime
 * totals from ClickHouse with each link's `max_clicks` and flags the ones that reached
 * it (the edge then treats them as expired). A link can therefore overshoot its cap by
 * whatever traffic arrives within one cron interval plus the ingest delay.
 *
 * When the owner edits the cap, the new state is decided right away instead of waiting
 * for the next run: removing or raising the cap re-opens a closed link (unless the
 * lifetime total already exceeds the new cap), lowering it below the total closes it.
 */
export async function resolveClickLimitState(
  existing: Pick<LinkRow, "id" | "workspaceId" | "maxClicks" | "clickLimitReachedAt">,
  nextMax: number | null,
): Promise<Date | null> {
  if (nextMax == null) {
    return null;
  }
  if (nextMax === existing.maxClicks) {
    return existing.clickLimitReachedAt;
  }

  const totals = await loadLinkClickTotals(existing.workspaceId, [existing.id]);
  if (totals === null) {
    // ClickHouse is unreachable: re-open on a raise (the cron re-closes it if needed),
    // otherwise keep whatever state the link had.
    const raised = existing.maxClicks == null || nextMax > existing.maxClicks;
    return raised ? null : existing.clickLimitReachedAt;
  }

  const total = totals.get(existing.id) ?? 0;
  return total >= nextMax ? (existing.clickLimitReachedAt ?? new Date()) : null;
}

export type ClickLimitProgress = {
  maxClicks: number | null;
  /** Lifetime human clicks + QR scans; null when analytics are unavailable. */
  clicks: number | null;
  reached: boolean;
  reachedAt: string | null;
};

/** Progress for a page of links, e.g. "412 / 500" badges in the links table. */
export async function getClickLimitProgress(
  workspaceId: string,
  rows: Pick<LinkRow, "id" | "maxClicks" | "clickLimitReachedAt">[],
): Promise<Map<string, ClickLimitProgress>> {
  const limited = rows.filter((row) => row.maxClicks != null);
  const totals = await loadLinkClickTotals(
    workspaceId,
    limited.map((row) => row.id),
  );
  return new Map(
    limited.map((row) => [
      row.id,
      {
        maxClicks: row.maxClicks,
        clicks: totals ? (totals.get(row.id) ?? 0) : null,
        reached: row.clickLimitReachedAt != null,
        reachedAt: row.clickLimitReachedAt?.toISOString() ?? null,
      },
    ]),
  );
}

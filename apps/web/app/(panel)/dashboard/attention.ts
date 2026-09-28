import "server-only";
import { and, count, desc, domains, eq, getDb, isNotNull, isNull, links } from "@short/db";

export type AttentionLink = {
  id: string;
  /** `host/slug`, the way the links table shows it. */
  label: string;
  title: string | null;
  destination: string;
  /** When the problem started: broken since / limit reached at. */
  since: string | null;
  /** Last HTTP status the health check saw (broken links only). */
  statusCode: number | null;
  /** The cap that was hit (limit-reached links only). */
  maxClicks: number | null;
};

export type AttentionGroup = { total: number; items: AttentionLink[] };

export type Attention = {
  broken: AttentionGroup;
  limitReached: AttentionGroup;
};

/** How many of each problem the dashboard lists before "See all". */
const PREVIEW = 3;

/**
 * Live links that are not doing their job: the destination is failing (link-health
 * monitor), or the click limit was used up so visitors get the "expired" page.
 * Archived and moderation-disabled links are left out — nobody is being sent there.
 */
export async function loadAttention(workspaceId: string): Promise<Attention> {
  const db = getDb();
  const live = and(eq(links.workspaceId, workspaceId), eq(links.archived, false), isNull(links.disabledAt));
  const brokenWhere = and(live, eq(links.healthStatus, "broken"));
  const limitWhere = and(live, isNotNull(links.clickLimitReachedAt));

  const [brokenCount, brokenRows, limitCount, limitRows] = await Promise.all([
    db.select({ value: count() }).from(links).where(brokenWhere),
    db
      .select({ link: links, hostname: domains.hostname })
      .from(links)
      .innerJoin(domains, eq(links.domainId, domains.id))
      .where(brokenWhere)
      .orderBy(desc(links.brokenSince))
      .limit(PREVIEW),
    db.select({ value: count() }).from(links).where(limitWhere),
    db
      .select({ link: links, hostname: domains.hostname })
      .from(links)
      .innerJoin(domains, eq(links.domainId, domains.id))
      .where(limitWhere)
      .orderBy(desc(links.clickLimitReachedAt))
      .limit(PREVIEW),
  ]);

  return {
    broken: {
      total: brokenCount[0]?.value ?? 0,
      items: brokenRows.map(({ link, hostname }) => ({
        id: link.id,
        label: `${hostname}/${link.slug}`,
        title: link.title,
        destination: link.destination,
        since: link.brokenSince?.toISOString() ?? null,
        statusCode: link.healthStatusCode,
        maxClicks: null,
      })),
    },
    limitReached: {
      total: limitCount[0]?.value ?? 0,
      items: limitRows.map(({ link, hostname }) => ({
        id: link.id,
        label: `${hostname}/${link.slug}`,
        title: link.title,
        destination: link.destination,
        since: link.clickLimitReachedAt?.toISOString() ?? null,
        statusCode: null,
        maxClicks: link.maxClicks,
      })),
    },
  };
}

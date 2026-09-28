"use server";

import { and, desc, domains, eq, getDb, ilike, links, or, sql } from "@short/db";
import { fail, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { rateLimit } from "@/lib/redis";
import { requireWorkspace } from "@/lib/session";

export type PaletteLink = {
  id: string;
  hostname: string;
  slug: string;
  title: string | null;
  destination: string;
  archived: boolean;
};

const MAX_RESULTS = 8;
const MAX_QUERY_LENGTH = 100;
/** Generous for a debounced box, tight enough that a script cannot scrape through it. */
const SEARCH_LIMIT = 60;
const SEARCH_WINDOW_SEC = 60;

/**
 * Command palette lookup over the active workspace's links. Matches slug, title and
 * destination; slug prefix hits rank first, then the newest links.
 */
export async function searchPaletteLinksAction(
  rawQuery: string,
): Promise<ActionResult<PaletteLink[]>> {
  try {
    const context = await requireWorkspace();
    const query = typeof rawQuery === "string" ? rawQuery.trim().slice(0, MAX_QUERY_LENGTH) : "";
    if (query === "") {
      return ok([]);
    }

    const limit = await rateLimit(
      `palette-search:${context.user.id}`,
      SEARCH_LIMIT,
      SEARCH_WINDOW_SEC,
    );
    if (!limit.allowed) {
      return fail("rate_limited");
    }

    // `%` and `_` typed by the user are literals, not ILIKE wildcards.
    const escaped = query.replace(/[\\%_]/g, "\\$&");
    const contains = `%${escaped}%`;
    const prefix = `${escaped}%`;

    const rows = await getDb()
      .select({
        id: links.id,
        hostname: domains.hostname,
        slug: links.slug,
        title: links.title,
        destination: links.destination,
        archived: links.archived,
      })
      .from(links)
      .innerJoin(domains, eq(links.domainId, domains.id))
      .where(
        and(
          eq(links.workspaceId, context.workspace.id),
          or(
            ilike(links.slug, contains),
            ilike(links.title, contains),
            ilike(links.destination, contains),
          ),
        ),
      )
      .orderBy(sql`case when ${links.slug} ilike ${prefix} then 0 else 1 end`, desc(links.createdAt))
      .limit(MAX_RESULTS);

    return ok(rows);
  } catch (error) {
    return toActionError(error);
  }
}

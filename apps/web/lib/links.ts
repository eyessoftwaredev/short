import {
  generateSlug,
  hashGatePassword,
  KV_SCHEMA_VERSION,
  type LinkInput,
  type LinkKvRecord,
  type LinkListQuery,
} from "@short/core";
import {
  and,
  asc,
  count,
  desc,
  domains,
  eq,
  getDb,
  ilike,
  isNotNull,
  isNull,
  links,
  lt,
  or,
  sql,
  type DomainRow,
  type LinkRow,
} from "@short/db";
import { deleteLinkRecord, putLinkRecord, replaceLinkRecord } from "./kv";

export type LinkWithDomain = LinkRow & { hostname: string };

export function toKvRecord(link: LinkRow, hostname: string): LinkKvRecord {
  return {
    v: KV_SCHEMA_VERSION,
    id: link.id,
    workspaceId: link.workspaceId,
    hostname,
    slug: link.slug,
    destination: link.destination,
    rules: link.rules,
    abVariants: link.abVariants,
    utm: link.utm ?? null,
    expiresAt: link.expiresAt ? link.expiresAt.getTime() : null,
    expiredDestination: link.expiredDestination,
    passwordHash: link.passwordHash,
    iosDestination: link.iosDestination,
    androidDestination: link.androidDestination,
    cloaked: link.cloaked,
    noIndex: link.noIndex,
    forwardQuery: link.forwardQuery,
    disabled: link.archived || link.disabledAt != null,
    title: link.title,
    description: link.description,
    image: link.image,
  };
}

export function shortUrl(hostname: string, slug: string): string {
  return `https://${hostname}/${slug}`;
}

async function requireDomain(workspaceId: string, domainId: string): Promise<DomainRow> {
  const [domain] = await getDb()
    .select()
    .from(domains)
    .where(
      and(
        eq(domains.id, domainId),
        // Platform domains are shared; customer domains must belong to this workspace.
        or(eq(domains.workspaceId, workspaceId), eq(domains.isPlatform, true)),
      ),
    )
    .limit(1);

  if (!domain) {
    throw new Error("Domain not found");
  }
  return domain;
}

/** Retries on the unique (domain_id, slug) index rather than pre-checking, so two
 *  concurrent creates can never hand out the same slug. */
const SLUG_ATTEMPTS = 6;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "23505"
  );
}

export type CreateLinkParams = {
  workspaceId: string;
  /** Null when the link was created by an API key rather than a signed-in user. */
  creatorId: string | null;
  input: LinkInput;
};

export async function createLink({
  workspaceId,
  creatorId,
  input,
}: CreateLinkParams): Promise<LinkWithDomain> {
  const db = getDb();
  const domain = await requireDomain(workspaceId, input.domainId);
  const passwordHash = input.password ? await hashGatePassword(input.password) : null;

  const values = {
    workspaceId,
    creatorId,
    domainId: domain.id,
    folderId: input.folderId ?? null,
    destination: input.destination,
    title: input.title ?? null,
    description: input.description ?? null,
    image: input.image === "" ? null : (input.image ?? null),
    comments: input.comments ?? null,
    tags: input.tags,
    rules: input.rules,
    abVariants: input.abVariants,
    utm: input.utm,
    expiresAt: input.expiresAt ?? null,
    expiredDestination: input.expiredDestination ?? null,
    passwordHash,
    iosDestination: input.iosDestination ?? null,
    androidDestination: input.androidDestination ?? null,
    cloaked: input.cloaked,
    noIndex: input.noIndex,
    forwardQuery: input.forwardQuery,
    archived: input.archived,
  };

  for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt += 1) {
    const slug = input.slug ?? generateSlug(attempt < 3 ? 7 : 9);
    try {
      const [created] = await db
        .insert(links)
        .values({ ...values, slug })
        .returning();

      if (!created) {
        throw new Error("Link insert returned no row");
      }

      await putLinkRecord(toKvRecord(created, domain.hostname));
      return { ...created, hostname: domain.hostname };
    } catch (error) {
      // A caller-supplied slug that collides is a user error, not something to retry.
      if (input.slug || !isUniqueViolation(error)) {
        if (isUniqueViolation(error)) {
          throw new Error("That slug is already taken on this domain");
        }
        throw error;
      }
    }
  }

  throw new Error("Could not allocate a unique slug, please try again");
}

export type UpdateLinkParams = {
  workspaceId: string;
  linkId: string;
  input: LinkInput;
};

export async function updateLink({
  workspaceId,
  linkId,
  input,
}: UpdateLinkParams): Promise<LinkWithDomain> {
  const db = getDb();
  const existing = await getLink(workspaceId, linkId);
  if (!existing) {
    throw new Error("Link not found");
  }

  const domain = await requireDomain(workspaceId, input.domainId);

  // A null password clears the gate; an empty/undefined one leaves the existing hash.
  const passwordHash =
    input.password === null
      ? null
      : input.password
        ? await hashGatePassword(input.password)
        : existing.passwordHash;

  try {
    const [updated] = await db
      .update(links)
      .set({
        domainId: domain.id,
        slug: input.slug ?? existing.slug,
        folderId: input.folderId ?? null,
        destination: input.destination,
        title: input.title ?? null,
        description: input.description ?? null,
        image: input.image === "" ? null : (input.image ?? null),
        comments: input.comments ?? null,
        tags: input.tags,
        rules: input.rules,
        abVariants: input.abVariants,
        utm: input.utm,
        expiresAt: input.expiresAt ?? null,
        expiredDestination: input.expiredDestination ?? null,
        passwordHash,
        iosDestination: input.iosDestination ?? null,
        androidDestination: input.androidDestination ?? null,
        cloaked: input.cloaked,
        noIndex: input.noIndex,
        forwardQuery: input.forwardQuery,
        archived: input.archived,
        updatedAt: new Date(),
      })
      .where(and(eq(links.id, linkId), eq(links.workspaceId, workspaceId)))
      .returning();

    if (!updated) {
      throw new Error("Link not found");
    }

    await replaceLinkRecord(
      { hostname: existing.hostname, slug: existing.slug },
      toKvRecord(updated, domain.hostname),
    );

    return { ...updated, hostname: domain.hostname };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error("That slug is already taken on this domain");
    }
    throw error;
  }
}

export async function deleteLink(workspaceId: string, linkId: string): Promise<void> {
  const existing = await getLink(workspaceId, linkId);
  if (!existing) {
    return;
  }

  await getDb()
    .delete(links)
    .where(and(eq(links.id, linkId), eq(links.workspaceId, workspaceId)));

  await deleteLinkRecord(existing.hostname, existing.slug);
}

export async function setLinkArchived(
  workspaceId: string,
  linkId: string,
  archived: boolean,
): Promise<void> {
  const existing = await getLink(workspaceId, linkId);
  if (!existing) {
    return;
  }

  const [updated] = await getDb()
    .update(links)
    .set({ archived, updatedAt: new Date() })
    .where(and(eq(links.id, linkId), eq(links.workspaceId, workspaceId)))
    .returning();

  if (updated) {
    await putLinkRecord(toKvRecord(updated, existing.hostname));
  }
}

export async function getLink(
  workspaceId: string,
  linkId: string,
): Promise<LinkWithDomain | null> {
  const [row] = await getDb()
    .select({ link: links, hostname: domains.hostname })
    .from(links)
    .innerJoin(domains, eq(links.domainId, domains.id))
    .where(and(eq(links.id, linkId), eq(links.workspaceId, workspaceId)))
    .limit(1);

  return row ? { ...row.link, hostname: row.hostname } : null;
}

export type LinkListResult = {
  items: LinkWithDomain[];
  total: number;
};

export async function listLinks(
  workspaceId: string,
  query: LinkListQuery,
): Promise<LinkListResult> {
  const db = getDb();
  const filters = [eq(links.workspaceId, workspaceId)];

  if (query.search) {
    const pattern = `%${query.search}%`;
    const searchFilter = or(
      ilike(links.slug, pattern),
      ilike(links.destination, pattern),
      ilike(links.title, pattern),
    );
    if (searchFilter) {
      filters.push(searchFilter);
    }
  }
  if (query.domainId) {
    filters.push(eq(links.domainId, query.domainId));
  }
  if (query.folderId) {
    filters.push(eq(links.folderId, query.folderId));
  }
  if (query.tag) {
    filters.push(sql`${links.tags} @> ${JSON.stringify([query.tag])}::jsonb`);
  }

  if (query.status === "active") {
    filters.push(eq(links.archived, false));
  } else if (query.status === "archived") {
    filters.push(eq(links.archived, true));
  } else if (query.status === "expired") {
    filters.push(isNotNull(links.expiresAt));
    filters.push(lt(links.expiresAt, new Date()));
  }

  const where = and(...filters);

  const orderBy = (() => {
    switch (query.sort) {
      case "created_asc":
        return asc(links.createdAt);
      case "slug_asc":
        return asc(links.slug);
      // Click ordering lives in ClickHouse; the list falls back to recency here and the
      // analytics pages provide the real ranking.
      case "clicks_desc":
      case "created_desc":
      default:
        return desc(links.createdAt);
    }
  })();

  const [rows, totals] = await Promise.all([
    db
      .select({ link: links, hostname: domains.hostname })
      .from(links)
      .innerJoin(domains, eq(links.domainId, domains.id))
      .where(where)
      .orderBy(orderBy)
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ value: count() }).from(links).where(where),
  ]);

  return {
    items: rows.map((row) => ({ ...row.link, hostname: row.hostname })),
    total: totals[0]?.value ?? 0,
  };
}

export async function listWorkspaceDomains(workspaceId: string): Promise<DomainRow[]> {
  return getDb()
    .select()
    .from(domains)
    .where(or(eq(domains.workspaceId, workspaceId), eq(domains.isPlatform, true)))
    .orderBy(desc(domains.isDefault), asc(domains.hostname));
}

/** Pushes a single link back to KV, e.g. after an admin lifts an abuse flag. */
export async function syncLinkToKv(linkId: string): Promise<void> {
  const [row] = await getDb()
    .select({ link: links, hostname: domains.hostname })
    .from(links)
    .innerJoin(domains, eq(links.domainId, domains.id))
    .where(eq(links.id, linkId))
    .limit(1);

  if (!row) {
    return;
  }
  await putLinkRecord(toKvRecord(row.link, row.hostname));
}

/** Rewrites every KV record for a workspace, e.g. after a domain hostname change. */
export async function resyncWorkspaceLinks(workspaceId: string): Promise<number> {
  const rows = await getDb()
    .select({ link: links, hostname: domains.hostname })
    .from(links)
    .innerJoin(domains, eq(links.domainId, domains.id))
    .where(and(eq(links.workspaceId, workspaceId), isNull(links.disabledAt)));

  for (const row of rows) {
    await putLinkRecord(toKvRecord(row.link, row.hostname));
  }
  return rows.length;
}

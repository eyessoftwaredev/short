import {
  isValidHostname,
  normalizeHostInput,
  rewriteHostname,
  safeDestinationSchema,
  type AbVariant,
  type TargetRule,
} from "@short/core";
import { domains, eq, getDb, links, type DomainRow, type LinkRow } from "@short/db";
import { toDomainKvRecord } from "./domains";
import { putDomainRecord, putLinkRecords } from "./kv";
import { toKvRecord } from "./links";

export const DESTINATION_REWRITE_LIMIT = 5_000;

export class DestinationRewriteError extends Error {
  constructor(readonly code: "invalid_host" | "same_host" | "too_many") {
    super(code);
    this.name = "DestinationRewriteError";
  }
}

export type DestinationRewriteSample = { hostname: string; slug: string };

export type DestinationRewritePreview = {
  from: string;
  to: string;
  links: number;
  domains: number;
  samples: DestinationRewriteSample[];
};

export type DestinationRewriteResult = {
  from: string;
  to: string;
  links: number;
  domains: number;
  fields: string[];
};

type HostPair = { from: string; to: string };

function pair(fromRaw: string, toRaw: string): HostPair {
  const from = normalizeHostInput(fromRaw);
  const to = normalizeHostInput(toRaw);
  if (!isValidHostname(from) || !isValidHostname(to)) {
    throw new DestinationRewriteError("invalid_host");
  }
  if (from === to) {
    throw new DestinationRewriteError("same_host");
  }
  return { from, to };
}

function rewriteField(value: string | null, from: string, to: string): { next: string | null; changed: boolean } {
  if (value == null || value === "") {
    return { next: value, changed: false };
  }
  const rewritten = rewriteHostname(value, from, to);
  if (rewritten == null || rewritten === value) {
    return { next: value, changed: false };
  }
  const parsed = safeDestinationSchema.safeParse(rewritten);
  if (!parsed.success) {
    return { next: value, changed: false };
  }
  return { next: parsed.data, changed: true };
}

function rewriteList<T extends { destination: string }>(
  items: T[],
  from: string,
  to: string,
): { next: T[]; changed: boolean } {
  let changed = false;
  const next = items.map((item) => {
    const result = rewriteField(item.destination, from, to);
    if (!result.changed || result.next == null) {
      return item;
    }
    changed = true;
    return { ...item, destination: result.next };
  });
  return { next, changed };
}

type LinkPatch = {
  destination: string;
  iosDestination: string | null;
  androidDestination: string | null;
  expiredDestination: string | null;
  rules: TargetRule[];
  abVariants: AbVariant[];
};

function rewriteLink(link: LinkRow, from: string, to: string): { patch: LinkPatch; fields: string[] } | null {
  const destination = rewriteField(link.destination, from, to);
  const ios = rewriteField(link.iosDestination, from, to);
  const android = rewriteField(link.androidDestination, from, to);
  const expired = rewriteField(link.expiredDestination, from, to);
  const rules = rewriteList(link.rules, from, to);
  const variants = rewriteList(link.abVariants, from, to);

  const fields: string[] = [];
  if (destination.changed) {
    fields.push("destination");
  }
  if (ios.changed) {
    fields.push("iosDestination");
  }
  if (android.changed) {
    fields.push("androidDestination");
  }
  if (expired.changed) {
    fields.push("expiredDestination");
  }
  if (rules.changed) {
    fields.push("rules");
  }
  if (variants.changed) {
    fields.push("abVariants");
  }
  if (fields.length === 0) {
    return null;
  }

  return {
    fields,
    patch: {
      destination: destination.next ?? link.destination,
      iosDestination: ios.next,
      androidDestination: android.next,
      expiredDestination: expired.next,
      rules: rules.next,
      abVariants: variants.next,
    },
  };
}

function rewriteDomain(row: DomainRow, from: string, to: string): {
  rootDestination: string | null;
  notFoundDestination: string | null;
  fields: string[];
} | null {
  const root = rewriteField(row.rootDestination, from, to);
  const notFound = rewriteField(row.notFoundDestination, from, to);
  const fields: string[] = [];
  if (root.changed) {
    fields.push("rootDestination");
  }
  if (notFound.changed) {
    fields.push("notFoundDestination");
  }
  if (fields.length === 0) {
    return null;
  }
  return {
    rootDestination: root.next,
    notFoundDestination: notFound.next,
    fields,
  };
}

async function loadWorkspaceLinks(workspaceId: string): Promise<Array<{ link: LinkRow; hostname: string }>> {
  return getDb()
    .select({ link: links, hostname: domains.hostname })
    .from(links)
    .innerJoin(domains, eq(links.domainId, domains.id))
    .where(eq(links.workspaceId, workspaceId));
}

async function loadWorkspaceDomains(workspaceId: string): Promise<DomainRow[]> {
  return getDb().select().from(domains).where(eq(domains.workspaceId, workspaceId));
}

export async function previewDestinationRewrite(
  workspaceId: string,
  fromRaw: string,
  toRaw: string,
): Promise<DestinationRewritePreview> {
  const { from, to } = pair(fromRaw, toRaw);
  const [linkRows, domainRows] = await Promise.all([
    loadWorkspaceLinks(workspaceId),
    loadWorkspaceDomains(workspaceId),
  ]);

  const matched = linkRows.filter((row) => rewriteLink(row.link, from, to) != null);
  const domainMatches = domainRows.filter((row) => rewriteDomain(row, from, to) != null);

  return {
    from,
    to,
    links: matched.length,
    domains: domainMatches.length,
    samples: matched.slice(0, 10).map((row) => ({ hostname: row.hostname, slug: row.link.slug })),
  };
}

export async function applyDestinationRewrite(
  workspaceId: string,
  fromRaw: string,
  toRaw: string,
): Promise<DestinationRewriteResult> {
  const { from, to } = pair(fromRaw, toRaw);
  const [linkRows, domainRows] = await Promise.all([
    loadWorkspaceLinks(workspaceId),
    loadWorkspaceDomains(workspaceId),
  ]);

  const linkChanges = linkRows.flatMap((row) => {
    const rewritten = rewriteLink(row.link, from, to);
    return rewritten ? [{ row, ...rewritten }] : [];
  });
  const domainChanges = domainRows.flatMap((row) => {
    const rewritten = rewriteDomain(row, from, to);
    return rewritten ? [{ row, ...rewritten }] : [];
  });

  if (linkChanges.length > DESTINATION_REWRITE_LIMIT) {
    throw new DestinationRewriteError("too_many");
  }

  const fieldSet = new Set<string>();
  const now = new Date();

  await getDb().transaction(async (tx) => {
    for (const change of linkChanges) {
      for (const field of change.fields) {
        fieldSet.add(field);
      }
      await tx
        .update(links)
        .set({ ...change.patch, updatedAt: now })
        .where(eq(links.id, change.row.link.id));
    }
    for (const change of domainChanges) {
      for (const field of change.fields) {
        fieldSet.add(field);
      }
      await tx
        .update(domains)
        .set({
          rootDestination: change.rootDestination,
          notFoundDestination: change.notFoundDestination,
          updatedAt: now,
        })
        .where(eq(domains.id, change.row.id));
    }
  });

  await putLinkRecords(
    linkChanges.map((change) =>
      toKvRecord({ ...change.row.link, ...change.patch, updatedAt: now }, change.row.hostname),
    ),
  );
  for (const change of domainChanges) {
    await putDomainRecord(
      toDomainKvRecord({
        ...change.row,
        rootDestination: change.rootDestination,
        notFoundDestination: change.notFoundDestination,
        updatedAt: now,
      }),
    );
  }

  return {
    from,
    to,
    links: linkChanges.length,
    domains: domainChanges.length,
    fields: [...fieldSet],
  };
}

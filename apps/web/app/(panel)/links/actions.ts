"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { serializeLink } from "@/lib/api-serializers";
import { recordAudit } from "@/lib/audit";
import { incrementLinksCreated } from "@/lib/billing";
import { fail, ok, toActionError, type ActionResult } from "@/lib/action-result";
import {
  applyDestinationRewrite,
  DestinationRewriteError,
  previewDestinationRewrite,
  type DestinationRewritePreview,
  type DestinationRewriteResult,
} from "@/lib/bulk-destinations";
import {
  linkInputSchema,
  normalizeHostInput,
  type LinkInput,
  type PlanDefinition,
} from "@short/core";
import {
  and,
  domains,
  eq,
  folders,
  getDb,
  inArray,
  links,
  ne,
  sql,
  type LinkRow,
} from "@short/db";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { deleteLinkRecords, putLinkRecords } from "@/lib/kv";
import { linksToCsv } from "@/lib/link-csv";
import { linkFormSchema, toLinkInput, type LinkFormValues } from "@/lib/link-form";
import {
  createLink,
  deleteLink,
  getLink,
  setLinkArchived,
  shortUrl,
  toKvRecord,
  updateLink,
  type LinkWithDomain,
} from "@/lib/links";
import { lookupThreat, scanDestination } from "@/lib/abuse";
import { assertOwnedMedia } from "@/lib/media";
import { assertFeature, assertQuota, assertSlugLength } from "@/lib/quota";
import { requireWorkspace, requireWorkspaceRole } from "@/lib/session";
import { dispatchWebhook } from "@/lib/webhooks";

export type SavedLink = { id: string; shortUrl: string };

export async function createLinkAction(values: LinkFormValues): Promise<ActionResult<SavedLink>> {
  try {
    const context = await requireWorkspace();
    const parsed = linkFormSchema.safeParse(values);
    if (!parsed.success) {
      return toActionError(parsed.error);
    }

    const input = applyPlanLimits(toLinkInput(parsed.data), context.plan);

    await assertQuota(context.workspace.id, context.plan, "links");
    assertLinkFeatures(input, context.plan);
    await assertOwnedMedia(context.workspace.id, input.image);
    assertSlugLength({
      slug: input.slug,
      plan: context.plan,
      isSuperadmin: context.isSuperadmin,
    });

    const link = await createLink({
      workspaceId: context.workspace.id,
      creatorId: context.user.id,
      input,
    });
    await scanDestination(context.workspace.id, link.id, input.destination);

    await incrementLinksCreated(context.workspace.id);

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "link.created",
      targetType: "link",
      targetId: link.id,
      metadata: { slug: link.slug, hostname: link.hostname },
    });

    after(() => dispatchWebhook(context.workspace.id, "link.created", serializeLink(link)));

    revalidatePath("/links");
    revalidatePath("/dashboard");

    return ok({ id: link.id, shortUrl: shortUrl(link.hostname, link.slug) });
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateLinkAction(
  linkId: string,
  values: LinkFormValues,
): Promise<ActionResult<SavedLink>> {
  try {
    const context = await requireWorkspace();
    const parsed = linkFormSchema.safeParse(values);
    if (!parsed.success) {
      return toActionError(parsed.error);
    }

    const existing = await getLink(context.workspace.id, linkId);
    if (!existing) {
      return fail("generic");
    }

    // An already-expired link stays editable as long as its expiry is left unchanged.
    const input = applyPlanLimits(
      toLinkInput(parsed.data, { currentExpiresAt: existing.expiresAt }),
      context.plan,
    );
    assertLinkFeatures(input, context.plan);
    await assertOwnedMedia(context.workspace.id, input.image);

    assertSlugLength({
      slug: input.slug,
      plan: context.plan,
      isSuperadmin: context.isSuperadmin,
      previous: existing.slug,
    });

    const link = await updateLink({ workspaceId: context.workspace.id, linkId, input });
    await scanDestination(context.workspace.id, link.id, input.destination);

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "link.updated",
      targetType: "link",
      targetId: link.id,
      metadata: { slug: link.slug },
    });

    after(() => dispatchWebhook(context.workspace.id, "link.updated", serializeLink(link)));

    revalidatePath("/links");
    revalidatePath(`/links/${linkId}`);
    revalidatePath("/qr");

    return ok({ id: link.id, shortUrl: shortUrl(link.hostname, link.slug) });
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteLinkAction(linkId: string): Promise<ActionResult> {
  try {
    const context = await requireWorkspace();
    // Mirrors `canDelete` on the list page, which also lets superadmins through.
    if (context.role === "member" && !context.isSuperadmin) {
      return fail("delete_forbidden");
    }

    if (!(await deleteLink(context.workspace.id, linkId))) {
      return fail("generic");
    }
    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "link.deleted",
      targetType: "link",
      targetId: linkId,
    });

    after(() => dispatchWebhook(context.workspace.id, "link.deleted", { id: linkId }));

    revalidatePath("/links");
    revalidatePath("/dashboard");
    // QR codes cascade with their link.
    revalidatePath("/qr");
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

export async function archiveLinkAction(
  linkId: string,
  archived: boolean,
): Promise<ActionResult> {
  try {
    const context = await requireWorkspace();
    if (!(await setLinkArchived(context.workspace.id, linkId, Boolean(archived)))) {
      return fail("generic");
    }
    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: archived ? "link.archived" : "link.restored",
      targetType: "link",
      targetId: linkId,
    });

    revalidatePath("/links");
    return ok(undefined);
  } catch (error) {
    return toActionError(error);
  }
}

function fromRewriteError(error: unknown): ActionResult<never> {
  if (error instanceof DestinationRewriteError) {
    if (error.code === "invalid_host") {
      return fail("domain_invalid");
    }
    if (error.code === "same_host") {
      return fail("rewrite_same");
    }
    return fail("rewrite_too_many");
  }
  return toActionError(error);
}

export async function previewDestinationRewriteAction(
  from: string,
  to: string,
): Promise<ActionResult<DestinationRewritePreview>> {
  try {
    const context = await requireWorkspaceRole("admin");
    return ok(await previewDestinationRewrite(context.workspace.id, from, to));
  } catch (error) {
    return fromRewriteError(error);
  }
}

export async function applyDestinationRewriteAction(
  from: string,
  to: string,
): Promise<ActionResult<DestinationRewriteResult>> {
  try {
    const context = await requireWorkspaceRole("admin");
    // A bulk rewrite skips the per-link scan, so the new host is checked once up front:
    // otherwise benign links could be created and then pointed at a known-bad host.
    if (await lookupThreat(`https://${normalizeHostInput(to)}/`)) {
      return fail("rewrite_unsafe");
    }
    const result = await applyDestinationRewrite(context.workspace.id, from, to);

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "link.destinations.rewritten",
      targetType: "workspace",
      targetId: context.workspace.id,
      metadata: {
        from: result.from,
        to: result.to,
        links: result.links,
        domains: result.domains,
        fields: result.fields,
      },
    });

    revalidatePath("/links");
    revalidatePath("/domains");
    return ok(result);
  } catch (error) {
    return fromRewriteError(error);
  }
}

/** A duplicate is created with a fresh random slug and lands on its edit page. */
export async function duplicateLinkAction(linkId: string): Promise<ActionResult<SavedLink>> {
  try {
    const context = await requireWorkspace();
    const source = typeof linkId === "string" ? await getLink(context.workspace.id, linkId) : null;
    if (!source) {
      return fail("not_found");
    }
    // A link disabled by moderation must not be re-published under a new slug.
    if (source.disabledAt != null) {
      return fail("generic");
    }

    await assertQuota(context.workspace.id, context.plan, "links");

    const t = await getTranslations("links");
    const now = Date.now();
    const keepsExpiry = source.expiresAt != null && source.expiresAt.getTime() > now;
    const input = applyPlanLimits(
      linkInputSchema.parse({
        domainId: source.domainId,
        destination: source.destination,
        title: source.title ? `${source.title}${t("table.copySuffix")}`.slice(0, 255) : undefined,
        description: source.description ?? undefined,
        image: source.image ?? undefined,
        comments: source.comments ?? undefined,
        folderId: source.folderId,
        tags: source.tags,
        startsAt: source.startsAt,
        // An already-lapsed expiry would publish the copy as expired; drop it instead.
        expiresAt: keepsExpiry ? source.expiresAt : null,
        expiredDestination: keepsExpiry ? source.expiredDestination : null,
        iosDestination: source.iosDestination,
        androidDestination: source.androidDestination,
        cloaked: source.cloaked,
        noIndex: source.noIndex,
        forwardQuery: source.forwardQuery,
        openMode: source.openMode,
        archived: false,
        utm: source.utm ?? null,
        rules: source.rules,
        abVariants: source.abVariants,
      }),
      context.plan,
    );
    assertLinkFeatures(input, context.plan);
    await assertOwnedMedia(context.workspace.id, input.image);

    const created = await createLink({
      workspaceId: context.workspace.id,
      creatorId: context.user.id,
      input,
      deferKv: true,
    });

    // The gate password is only stored as a hash, so it is copied as one.
    let link: LinkWithDomain = created;
    if (source.passwordHash && context.plan.features.passwordProtection) {
      const [row] = await getDb()
        .update(links)
        .set({ passwordHash: source.passwordHash })
        .where(and(eq(links.id, created.id), eq(links.workspaceId, context.workspace.id)))
        .returning();
      if (row) {
        link = { ...row, hostname: created.hostname };
      }
    }
    await putLinkRecords([toKvRecord(link, link.hostname)]);
    await scanDestination(context.workspace.id, link.id, link.destination);
    await incrementLinksCreated(context.workspace.id);

    await recordAudit({
      workspaceId: context.workspace.id,
      actorId: context.user.id,
      impersonatorId: context.impersonatedBy,
      action: "link.created",
      targetType: "link",
      targetId: link.id,
      metadata: { slug: link.slug, hostname: link.hostname, duplicatedFrom: source.id },
    });

    after(() => dispatchWebhook(context.workspace.id, "link.created", serializeLink(link)));

    revalidatePath("/links");
    revalidatePath("/dashboard");
    return ok({ id: link.id, shortUrl: shortUrl(link.hostname, link.slug) });
  } catch (error) {
    return toActionError(error);
  }
}

/** One bulk request touches at most this many links; the table selects one page at a time. */
const BULK_MAX = 200;
const bulkIdsSchema = z.array(z.string().uuid()).min(1).max(BULK_MAX);

export type BulkLinkResult = { count: number };

function parseBulkIds(ids: unknown): string[] | null {
  const parsed = bulkIdsSchema.safeParse(ids);
  return parsed.success ? [...new Set(parsed.data)] : null;
}

/** Every bulk query is scoped by workspace, so foreign ids in the request are ignored. */
function inWorkspace(workspaceId: string, ids: string[]) {
  return and(eq(links.workspaceId, workspaceId), inArray(links.id, ids));
}

async function withHostnames(rows: LinkRow[]): Promise<LinkWithDomain[]> {
  if (rows.length === 0) {
    return [];
  }
  const domainRows = await getDb()
    .select({ id: domains.id, hostname: domains.hostname })
    .from(domains)
    .where(inArray(domains.id, [...new Set(rows.map((row) => row.domainId))]));
  const hostById = new Map(domainRows.map((row) => [row.id, row.hostname]));
  return rows.map((row) => ({ ...row, hostname: hostById.get(row.domainId) ?? "" }));
}

function dispatchUpdated(workspaceId: string, rows: LinkWithDomain[]): void {
  after(async () => {
    for (const row of rows) {
      await dispatchWebhook(workspaceId, "link.updated", serializeLink(row));
    }
  });
}

export async function bulkArchiveLinksAction(
  ids: string[],
  archived: boolean,
): Promise<ActionResult<BulkLinkResult>> {
  try {
    const context = await requireWorkspace();
    const list = parseBulkIds(ids);
    if (!list) {
      return fail("validation");
    }
    const target = Boolean(archived);

    const updated = await getDb()
      .update(links)
      .set({ archived: target, updatedAt: new Date() })
      .where(and(inWorkspace(context.workspace.id, list), ne(links.archived, target)))
      .returning();

    if (updated.length > 0) {
      const rows = await withHostnames(updated);
      // One bulk KV write for the whole selection.
      await putLinkRecords(rows.map((row) => toKvRecord(row, row.hostname)));
      await recordAudit({
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        impersonatorId: context.impersonatedBy,
        action: target ? "link.bulk_archived" : "link.bulk_restored",
        targetType: "workspace",
        targetId: context.workspace.id,
        metadata: { count: rows.length, linkIds: rows.map((row) => row.id) },
      });
    }

    revalidatePath("/links");
    return ok({ count: updated.length });
  } catch (error) {
    return toActionError(error);
  }
}

export async function bulkMoveLinksAction(
  ids: string[],
  folderId: string | null,
): Promise<ActionResult<BulkLinkResult>> {
  try {
    const context = await requireWorkspace();
    const list = parseBulkIds(ids);
    if (!list || (folderId !== null && !z.string().uuid().safeParse(folderId).success)) {
      return fail("validation");
    }
    if (folderId !== null) {
      const [folder] = await getDb()
        .select({ id: folders.id })
        .from(folders)
        .where(and(eq(folders.id, folderId), eq(folders.workspaceId, context.workspace.id)))
        .limit(1);
      if (!folder) {
        return fail("not_found");
      }
    }

    const updated = await getDb()
      .update(links)
      .set({ folderId, updatedAt: new Date() })
      .where(
        and(
          inWorkspace(context.workspace.id, list),
          sql`${links.folderId} IS DISTINCT FROM ${folderId}`,
        ),
      )
      .returning();

    // Folders are panel-only metadata: nothing in the KV record changes.
    if (updated.length > 0) {
      const rows = await withHostnames(updated);
      await recordAudit({
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        impersonatorId: context.impersonatedBy,
        action: "link.bulk_moved",
        targetType: "workspace",
        targetId: context.workspace.id,
        metadata: { count: rows.length, folderId, linkIds: rows.map((row) => row.id) },
      });
      dispatchUpdated(context.workspace.id, rows);
    }

    revalidatePath("/links");
    return ok({ count: updated.length });
  } catch (error) {
    return toActionError(error);
  }
}

/** Same limits as the link form: tags are comma separated there, so no commas here. */
const bulkTagSchema = z
  .string()
  .trim()
  .min(1)
  .max(48)
  .refine((value) => !value.includes(","));
const MAX_TAGS = 20;

export async function bulkTagLinksAction(
  ids: string[],
  tag: string,
): Promise<ActionResult<BulkLinkResult>> {
  try {
    const context = await requireWorkspace();
    const list = parseBulkIds(ids);
    const parsedTag = bulkTagSchema.safeParse(tag);
    if (!list || !parsedTag.success) {
      return fail("validation");
    }
    const tagJson = JSON.stringify([parsedTag.data]);

    // Links that already carry the tag, or are at the tag limit, are left untouched.
    const updated = await getDb()
      .update(links)
      .set({ tags: sql`${links.tags} || ${tagJson}::jsonb`, updatedAt: new Date() })
      .where(
        and(
          inWorkspace(context.workspace.id, list),
          sql`NOT (${links.tags} @> ${tagJson}::jsonb)`,
          sql`jsonb_array_length(${links.tags}) < ${MAX_TAGS}`,
        ),
      )
      .returning();

    if (updated.length > 0) {
      const rows = await withHostnames(updated);
      await recordAudit({
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        impersonatorId: context.impersonatedBy,
        action: "link.bulk_tagged",
        targetType: "workspace",
        targetId: context.workspace.id,
        metadata: { count: rows.length, tag: parsedTag.data, linkIds: rows.map((row) => row.id) },
      });
      dispatchUpdated(context.workspace.id, rows);
    }

    revalidatePath("/links");
    return ok({ count: updated.length });
  } catch (error) {
    return toActionError(error);
  }
}

export async function bulkDeleteLinksAction(ids: string[]): Promise<ActionResult<BulkLinkResult>> {
  try {
    const context = await requireWorkspace();
    // Same rule as the single delete and the list page's `canDelete`.
    if (context.role === "member" && !context.isSuperadmin) {
      return fail("delete_forbidden");
    }
    const list = parseBulkIds(ids);
    if (!list) {
      return fail("validation");
    }

    const deleted = await getDb()
      .delete(links)
      .where(inWorkspace(context.workspace.id, list))
      .returning();
    const rows = await withHostnames(deleted);

    await deleteLinkRecords(rows);

    if (rows.length > 0) {
      await recordAudit({
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        impersonatorId: context.impersonatedBy,
        action: "link.bulk_deleted",
        targetType: "workspace",
        targetId: context.workspace.id,
        metadata: {
          count: rows.length,
          links: rows.map((row) => ({ id: row.id, slug: row.slug, hostname: row.hostname })),
        },
      });
      after(async () => {
        for (const row of rows) {
          await dispatchWebhook(context.workspace.id, "link.deleted", { id: row.id });
        }
      });
    }

    revalidatePath("/links");
    revalidatePath("/dashboard");
    // QR codes cascade with their link.
    revalidatePath("/qr");
    return ok({ count: rows.length });
  } catch (error) {
    return toActionError(error);
  }
}

/** CSV of the selected links, in the same format as the full export (admins, like it). */
export async function exportSelectedLinksCsvAction(ids: string[]): Promise<ActionResult<string>> {
  try {
    const context = await requireWorkspaceRole("admin");
    const list = parseBulkIds(ids);
    if (!list) {
      return fail("validation");
    }
    const rows = await getDb()
      .select({ link: links, hostname: domains.hostname })
      .from(links)
      .innerJoin(domains, eq(links.domainId, domains.id))
      .where(inWorkspace(context.workspace.id, list));
    const order = new Map(list.map((id, index) => [id, index]));
    const sorted = rows
      .map((row) => ({ ...row.link, hostname: row.hostname }))
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return ok(linksToCsv(sorted));
  } catch (error) {
    return toActionError(error);
  }
}

export type LinkFolderOption = { id: string; name: string };

/** Folder choices for the bulk "Move to folder" dialog, loaded when it opens. */
export async function listLinkFoldersAction(): Promise<ActionResult<LinkFolderOption[]>> {
  try {
    const context = await requireWorkspace();
    const rows = await getDb()
      .select({ id: folders.id, name: folders.name })
      .from(folders)
      .where(eq(folders.workspaceId, context.workspace.id))
      .orderBy(folders.name);
    return ok(rows);
  } catch (error) {
    return toActionError(error);
  }
}

function applyPlanLimits(input: LinkInput, plan: PlanDefinition): LinkInput {
  return {
    ...input,
    rules: plan.features.targeting ? input.rules : [],
    abVariants: plan.features.abTesting ? input.abVariants : [],
    cloaked: plan.features.cloaking ? input.cloaked : false,
    password: plan.features.passwordProtection
      ? input.password
      : input.password === null
        ? null
        : undefined,
  };
}

function assertLinkFeatures(input: LinkInput, plan: PlanDefinition): void {
  if (input.rules.length > 0) {
    assertFeature(plan, "targeting");
  }
  if (input.abVariants.length > 0) {
    assertFeature(plan, "abTesting");
  }
  if (input.password) {
    assertFeature(plan, "passwordProtection");
  }
  if (input.cloaked) {
    assertFeature(plan, "cloaking");
  }
}

import { Hono } from "hono";
import { handle } from "hono/vercel";
import { after } from "next/server";
import { z } from "zod";
import {
  biopageInputSchema,
  domainInputSchema,
  linkInputSchema,
  linkListQuerySchema,
  qrInputSchema,
} from "@short/core";
import { scanDestination } from "@/lib/abuse";
import { recordAudit } from "@/lib/audit";
import { ApiError, checkApiRateLimit, resolveApiContext, type ApiContext } from "@/lib/api-auth";
import {
  serializeBiopage,
  serializeDomain,
  serializeLink,
  serializeQrCode,
} from "@/lib/api-serializers";
import { loadBreakdownSet, loadMonthlyClicks, loadSummary, loadTimeseries } from "@/lib/analytics";
import { incrementApiRequests, incrementLinksCreated } from "@/lib/billing";
import {
  createBiopage,
  getBiopage,
  handleTaken,
  listBiopages,
  updateBiopage,
} from "@/lib/biopages";
import { CloudflareError } from "@/lib/cloudflare";
import { addDomain } from "@/lib/domains";
import { serverEnv } from "@/lib/env";
import {
  createLink,
  deleteLink,
  getLink,
  listLinks,
  listWorkspaceDomains,
  updateLink,
} from "@/lib/links";
import { assertOwnedMedia, assertQrLogo } from "@/lib/media";
import { createQrCode, getQrCode, listQrCodes, updateQrCode } from "@/lib/qr-codes";
import {
  assertFeature,
  assertQuota,
  assertSlugLength,
  currentPeriod,
  getWorkspaceUsage,
} from "@/lib/quota";
import { QuotaError } from "@/lib/action-result";
import { clampRangeToRetention, resolveRange } from "@/lib/stats";
import { dispatchWebhook } from "@/lib/webhooks";
import { applyLinkDefaults, getLinkDefaults } from "@/lib/workspace-settings";
import { openApiDocument } from "./openapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Variables = { api: ApiContext };

const app = new Hono<{ Variables: Variables }>().basePath("/api/v1");

function errorBody(code: string, message: string, fields?: Record<string, string[]>) {
  return { error: { code, message, ...(fields ? { fields } : {}) } };
}

/**
 * Domain libraries throw plain `Error`s for caller mistakes (foreign ids, taken slugs).
 * They are mapped here so an integration gets a 4xx it can act on instead of a 500.
 */
const LIB_ERRORS: Record<string, [400 | 404 | 409, string]> = {
  "Domain not found": [400, "invalid_domain"],
  "Folder not found": [400, "invalid_folder"],
  "Link not found in this workspace": [400, "invalid_link"],
  "Image must be an uploaded workspace file": [400, "invalid_image"],
  "Image is not in this workspace": [400, "invalid_image"],
  "That slug is already taken on this domain": [409, "slug_taken"],
  "Domain already exists": [409, "domain_taken"],
  "Link not found": [404, "not_found"],
  "QR code not found": [404, "not_found"],
  "Bio page not found": [404, "not_found"],
};

/** Request bodies must be JSON objects; arrays, primitives and bad JSON are a 400. */
async function readJsonObject(req: { json: () => Promise<unknown> }): Promise<Record<string, unknown>> {
  const body: unknown = await req.json().catch(() => undefined);
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "invalid_json", "Request body must be a JSON object.");
  }
  return body as Record<string, unknown>;
}

const listPageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(100),
});

type BiopageInput = z.infer<typeof biopageInputSchema>;

/** A bio page may sit on the platform domain or on a domain this workspace owns. */
async function assertBiopageDomain(workspaceId: string, domainId: string | null): Promise<void> {
  if (!domainId) {
    return;
  }
  const available = await listWorkspaceDomains(workspaceId);
  if (!available.some((domain) => domain.id === domainId)) {
    throw new ApiError(400, "invalid_domain", "No domain with that id on this account.");
  }
}

/** Mirrors the panel: images must be files uploaded to this workspace. */
async function assertBiopageMedia(workspaceId: string, input: BiopageInput): Promise<void> {
  for (const value of [
    input.avatarUrl,
    input.logoUrl,
    input.coverUrl,
    input.ogImageUrl,
    input.bgImageUrl,
    input.adMobileImage,
    input.adLeftImage,
    input.adRightImage,
  ]) {
    await assertOwnedMedia(workspaceId, value);
  }
  for (const block of input.blocks) {
    if (block.type === "link") {
      await assertOwnedMedia(workspaceId, block.iconUrl);
    }
    if (block.type === "image") {
      await assertOwnedMedia(workspaceId, block.url);
    }
  }
}

function assertBiopageFeatures(plan: ApiContext["plan"], input: BiopageInput): void {
  if (input.customCss.trim() !== "") {
    assertFeature(plan, "customCss");
  }
  if (input.blocks.some((block) => block.type === "form")) {
    assertFeature(plan, "bioForms");
  }
  if (input.password) {
    assertFeature(plan, "passwordProtection");
  }
}

async function assertBiopageWritable(
  context: ApiContext,
  input: BiopageInput,
  existing?: { id: string; handle: string },
): Promise<void> {
  assertBiopageFeatures(context.plan, input);
  assertSlugLength({
    slug: input.handle,
    plan: context.plan,
    isSuperadmin: false,
    previous: existing?.handle,
    kind: "handle",
  });
  await assertBiopageDomain(context.workspace.id, input.domainId);
  await assertBiopageMedia(context.workspace.id, input);
  if (await handleTaken(input.handle, input.domainId, existing?.id)) {
    throw new ApiError(409, "handle_taken", "That handle is already taken on this domain.");
  }
}

app.get("/openapi.json", (c) =>
  c.json(openApiDocument(`${serverEnv().APP_URL.replace(/\/$/, "")}/api/v1`)),
);

/**
 * Auth + rate limiting for everything except the spec. Usage is counted after the
 * response is sent so the extra write never shows up in the caller's latency.
 */
app.use("*", async (c, next) => {
  const context = await resolveApiContext(c.req.raw.headers);
  const limit = await checkApiRateLimit(context);

  c.header("x-ratelimit-limit", String(context.plan.limits.apiRequestsPerHour));
  c.header("x-ratelimit-remaining", String(Math.max(0, limit.remaining)));
  c.header("x-ratelimit-reset", String(Math.floor(limit.resetAt / 1000)));

  if (!limit.allowed) {
    throw new ApiError(429, "rate_limited", "Hourly API limit reached for this plan.");
  }

  c.set("api", context);
  after(() => incrementApiRequests(context.workspace.id));

  await next();
});

app.get("/me", async (c) => {
  const { workspace, plan, keyName } = c.get("api");
  const [usage, clicks] = await Promise.all([
    getWorkspaceUsage(workspace.id),
    loadMonthlyClicks(workspace.id, currentPeriod(), 0),
  ]);

  return c.json({
    data: {
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
      key: { name: keyName },
      plan: { name: plan.name, key: plan.key, limits: plan.limits, features: plan.features },
      usage: { ...usage, clicksThisMonth: clicks },
    },
  });
});

app.get("/links", async (c) => {
  const { workspace } = c.get("api");
  const parsed = linkListQuerySchema.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams),
  );
  if (!parsed.success) {
    throw parsed.error;
  }

  const { items, total } = await listLinks(workspace.id, parsed.data);

  return c.json({
    data: items.map(serializeLink),
    pagination: { page: parsed.data.page, pageSize: parsed.data.pageSize, total },
  });
});

app.post("/links", async (c) => {
  const context = c.get("api");
  // Fields the caller left out (openMode, noIndex, forwardQuery, folderId, utm) take the
  // workspace's link defaults; anything sent explicitly, even null/false, wins.
  const body = applyLinkDefaults(await readJsonObject(c.req), await getLinkDefaults(context.workspace.id));
  const parsed = linkInputSchema.safeParse(body);
  if (!parsed.success) {
    throw parsed.error;
  }
  const input = parsed.data;

  await assertQuota(context.workspace.id, context.plan, "links");
  if (input.rules.length > 0) {
    assertFeature(context.plan, "targeting");
  }
  if (input.abVariants.length > 0) {
    assertFeature(context.plan, "abTesting");
  }
  if (input.password) {
    assertFeature(context.plan, "passwordProtection");
  }
  if (input.cloaked) {
    assertFeature(context.plan, "cloaking");
  }
  assertSlugLength({
    slug: input.slug,
    plan: context.plan,
    isSuperadmin: false,
  });
  await assertOwnedMedia(context.workspace.id, input.image);

  const link = await createLink({
    workspaceId: context.workspace.id,
    creatorId: null,
    input,
  });
  const resource = serializeLink(link);
  await scanDestination(context.workspace.id, link.id, input.destination);

  await incrementLinksCreated(context.workspace.id);
  await recordAudit({
    workspaceId: context.workspace.id,
    actorId: null,
    action: "link.created",
    targetType: "link",
    targetId: link.id,
    metadata: { slug: link.slug, via: "api", keyId: context.keyId },
  });
  after(() => dispatchWebhook(context.workspace.id, "link.created", resource));

  return c.json({ data: resource }, 201);
});

const idParam = z.string().uuid();

app.get("/links/:id", async (c) => {
  const { workspace } = c.get("api");
  const id = idParam.parse(c.req.param("id"));

  const link = await getLink(workspace.id, id);
  if (!link) {
    throw new ApiError(404, "not_found", "No link with that id on this account.");
  }
  return c.json({ data: serializeLink(link) });
});

app.patch("/links/:id", async (c) => {
  const context = c.get("api");
  const id = idParam.parse(c.req.param("id"));

  const existing = await getLink(context.workspace.id, id);
  if (!existing) {
    throw new ApiError(404, "not_found", "No link with that id on this account.");
  }

  // PATCH semantics: unspecified fields keep their stored value.
  const body = await readJsonObject(c.req);
  const merged = {
    domainId: existing.domainId,
    slug: existing.slug,
    destination: existing.destination,
    title: existing.title ?? undefined,
    description: existing.description ?? undefined,
    image: existing.image ?? undefined,
    comments: existing.comments ?? undefined,
    folderId: existing.folderId,
    tags: existing.tags,
    startsAt: existing.startsAt,
    expiresAt: existing.expiresAt,
    expiredDestination: existing.expiredDestination,
    iosDestination: existing.iosDestination,
    androidDestination: existing.androidDestination,
    cloaked: existing.cloaked,
    noIndex: existing.noIndex,
    forwardQuery: existing.forwardQuery,
    openMode: existing.openMode,
    maxClicks: existing.maxClicks,
    archived: existing.archived,
    utm: existing.utm,
    rules: existing.rules,
    abVariants: existing.abVariants,
    ...body,
  };

  const parsed = linkInputSchema.safeParse(merged);
  if (!parsed.success) {
    throw parsed.error;
  }
  const input = parsed.data;

  if (input.rules.length > 0) {
    assertFeature(context.plan, "targeting");
  }
  if (input.abVariants.length > 0) {
    assertFeature(context.plan, "abTesting");
  }
  if (input.password) {
    assertFeature(context.plan, "passwordProtection");
  }
  if (input.cloaked) {
    assertFeature(context.plan, "cloaking");
  }
  assertSlugLength({
    slug: input.slug,
    plan: context.plan,
    isSuperadmin: false,
    previous: existing.slug,
  });
  await assertOwnedMedia(context.workspace.id, input.image);

  const link = await updateLink({ workspaceId: context.workspace.id, linkId: id, input });
  const resource = serializeLink(link);
  if (input.destination !== existing.destination) {
    await scanDestination(context.workspace.id, link.id, input.destination);
  }

  await recordAudit({
    workspaceId: context.workspace.id,
    actorId: null,
    action: "link.updated",
    targetType: "link",
    targetId: id,
    metadata: { via: "api", keyId: context.keyId },
  });
  after(() => dispatchWebhook(context.workspace.id, "link.updated", resource));

  return c.json({ data: resource });
});

app.delete("/links/:id", async (c) => {
  const context = c.get("api");
  const id = idParam.parse(c.req.param("id"));

  const existing = await getLink(context.workspace.id, id);
  if (!existing) {
    throw new ApiError(404, "not_found", "No link with that id on this account.");
  }

  await deleteLink(context.workspace.id, id);
  await recordAudit({
    workspaceId: context.workspace.id,
    actorId: null,
    action: "link.deleted",
    targetType: "link",
    targetId: id,
    metadata: { slug: existing.slug, via: "api", keyId: context.keyId },
  });
  after(() =>
    dispatchWebhook(context.workspace.id, "link.deleted", {
      id,
      slug: existing.slug,
      hostname: existing.hostname,
    }),
  );

  return c.body(null, 204);
});

app.get("/links/:id/stats", async (c) => {
  const { workspace, plan } = c.get("api");
  const id = idParam.parse(c.req.param("id"));

  const link = await getLink(workspace.id, id);
  if (!link) {
    throw new ApiError(404, "not_found", "No link with that id on this account.");
  }

  const range = clampRangeToRetention(
    resolveRange(c.req.query("range"), c.req.query("from"), c.req.query("to")),
    plan.limits.retentionDays,
  );
  const scope = { workspaceId: workspace.id, linkId: id, from: range.from, to: range.to };

  const [summary, timeseries, breakdowns] = await Promise.all([
    loadSummary(scope),
    loadTimeseries(scope, range.granularity),
    loadBreakdownSet(scope, 10),
  ]);

  return c.json({
    data: {
      range: { key: range.key, from: range.from.toISOString(), to: range.to.toISOString() },
      summary,
      timeseries,
      breakdowns,
    },
  });
});

app.get("/analytics", async (c) => {
  const { workspace, plan } = c.get("api");
  const range = clampRangeToRetention(
    resolveRange(c.req.query("range"), c.req.query("from"), c.req.query("to")),
    plan.limits.retentionDays,
  );
  const scope = { workspaceId: workspace.id, from: range.from, to: range.to };

  const [summary, timeseries, breakdowns] = await Promise.all([
    loadSummary(scope),
    loadTimeseries(scope, range.granularity),
    loadBreakdownSet(scope, 10),
  ]);

  return c.json({
    data: {
      range: { key: range.key, from: range.from.toISOString(), to: range.to.toISOString() },
      summary,
      timeseries,
      breakdowns,
    },
  });
});

app.get("/domains", async (c) => {
  const { workspace } = c.get("api");
  const rows = await listWorkspaceDomains(workspace.id);
  return c.json({ data: rows.map(serializeDomain) });
});

app.post("/domains", async (c) => {
  const context = c.get("api");
  const parsed = domainInputSchema.safeParse(await readJsonObject(c.req));
  if (!parsed.success) {
    throw parsed.error;
  }
  await assertQuota(context.workspace.id, context.plan, "customDomains");
  const result = await addDomain(context.workspace.id, parsed.data);
  await recordAudit({
    workspaceId: context.workspace.id,
    actorId: null,
    action: "domain.add",
    targetType: "domain",
    targetId: result.domain.id,
    metadata: { hostname: result.domain.hostname, via: "api", keyId: context.keyId },
  });
  return c.json({ data: serializeDomain(result.domain) }, 201);
});

app.get("/qr-codes", async (c) => {
  const { workspace } = c.get("api");
  const { page, pageSize } = listPageQuery.parse(c.req.query());
  const { items, total } = await listQrCodes(workspace.id, page, pageSize);
  return c.json({
    data: items.map(serializeQrCode),
    pagination: { page, pageSize, total },
  });
});

app.post("/qr-codes", async (c) => {
  const context = c.get("api");
  const parsed = qrInputSchema.safeParse(await readJsonObject(c.req));
  if (!parsed.success) {
    throw parsed.error;
  }
  await assertQuota(context.workspace.id, context.plan, "qrCodes");
  if (parsed.data.style.logoUrl) {
    assertFeature(context.plan, "qrLogo");
    await assertQrLogo(context.workspace.id, parsed.data.style.logoUrl);
  }
  const row = await createQrCode(context.workspace.id, parsed.data);
  return c.json({ data: serializeQrCode(row) }, 201);
});

app.patch("/qr-codes/:id", async (c) => {
  const context = c.get("api");
  const id = idParam.parse(c.req.param("id"));
  const existing = await getQrCode(context.workspace.id, id);
  if (!existing) {
    throw new ApiError(404, "not_found", "No QR code with that id on this account.");
  }
  const parsed = qrInputSchema.safeParse({
    name: existing.name,
    payloadKind: existing.payloadKind,
    linkId: existing.linkId,
    payload: existing.payload,
    style: existing.style,
    ...(await readJsonObject(c.req)),
  });
  if (!parsed.success) {
    throw parsed.error;
  }
  if (parsed.data.style.logoUrl) {
    assertFeature(context.plan, "qrLogo");
    await assertQrLogo(context.workspace.id, parsed.data.style.logoUrl);
  }
  const row = await updateQrCode(context.workspace.id, id, parsed.data);
  return c.json({ data: serializeQrCode(row) });
});

app.get("/biopages", async (c) => {
  const { workspace } = c.get("api");
  const { page, pageSize } = listPageQuery.parse(c.req.query());
  const { items, total } = await listBiopages(workspace.id, page, pageSize);
  return c.json({
    data: items.map(serializeBiopage),
    pagination: { page, pageSize, total },
  });
});

app.post("/biopages", async (c) => {
  const context = c.get("api");
  const parsed = biopageInputSchema.safeParse(await readJsonObject(c.req));
  if (!parsed.success) {
    throw parsed.error;
  }
  await assertQuota(context.workspace.id, context.plan, "biopages");
  await assertBiopageWritable(context, parsed.data);
  const row = await createBiopage(context.workspace.id, parsed.data);
  return c.json({ data: { id: row.id, handle: row.handle, published: row.published } }, 201);
});

app.patch("/biopages/:id", async (c) => {
  const context = c.get("api");
  const id = idParam.parse(c.req.param("id"));
  const existing = await getBiopage(context.workspace.id, id);
  if (!existing) {
    throw new ApiError(404, "not_found", "No bio page with that id on this account.");
  }
  const parsed = biopageInputSchema.safeParse({
    handle: existing.handle,
    domainId: existing.domainId,
    displayName: existing.displayName,
    bio: existing.bio,
    avatarUrl: existing.avatarUrl,
    theme: existing.theme,
    buttonStyle: existing.buttonStyle,
    templateId: existing.templateId,
    bgType: existing.bgType,
    bgColor: existing.bgColor,
    bgGradient: existing.bgGradient,
    bgImageUrl: existing.bgImageUrl,
    buttonColor: existing.buttonColor,
    buttonTextColor: existing.buttonTextColor,
    textColor: existing.textColor,
    fontFamily: existing.fontFamily,
    profileMode: existing.profileMode,
    logoUrl: existing.logoUrl,
    profileText: existing.profileText,
    coverUrl: existing.coverUrl,
    ogImageUrl: existing.ogImageUrl,
    adsEnabled: existing.adsEnabled,
    adMobileImage: existing.adMobileImage,
    adMobileHref: existing.adMobileHref,
    adLeftImage: existing.adLeftImage,
    adLeftHref: existing.adLeftHref,
    adRightImage: existing.adRightImage,
    adRightHref: existing.adRightHref,
    customCss: existing.customCss,
    sensitive: existing.sensitive,
    publishAt: existing.publishAt,
    unpublishAt: existing.unpublishAt,
    seoTitle: existing.seoTitle,
    seoDescription: existing.seoDescription,
    published: existing.published,
    blocks: existing.blocks,
    ...(await readJsonObject(c.req)),
  });
  if (!parsed.success) {
    throw parsed.error;
  }
  await assertBiopageWritable(context, parsed.data, existing);
  const row = await updateBiopage(context.workspace.id, id, parsed.data);
  return c.json({ data: { id: row.id, handle: row.handle, published: row.published } });
});

app.notFound((c) => c.json(errorBody("not_found", "Unknown endpoint."), 404));

app.onError((error, c) => {
  if (error instanceof ApiError) {
    return c.json(errorBody(error.code, error.message), error.status);
  }
  if (error instanceof QuotaError) {
    return c.json(errorBody("quota_exceeded", error.message), 403);
  }
  if (error instanceof z.ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join(".") || "_body";
      fields[path] = [...(fields[path] ?? []), issue.message];
    }
    return c.json(errorBody("validation_failed", "Request body is invalid.", fields), 400);
  }
  if (error instanceof CloudflareError) {
    return c.json(errorBody("domain_rejected", "The hostname was rejected by the edge provider."), 400);
  }
  const mapped = LIB_ERRORS[error.message];
  if (mapped) {
    return c.json(errorBody(mapped[1], error.message), mapped[0]);
  }

  console.error("api/v1 failed", error);
  return c.json(errorBody("internal_error", "Something went wrong."), 500);
});

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);

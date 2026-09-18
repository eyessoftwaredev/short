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
import { createBiopage, getBiopage, listBiopages, updateBiopage } from "@/lib/biopages";
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
import { createQrCode, getQrCode, listQrCodes, updateQrCode } from "@/lib/qr-codes";
import {
  assertFeature,
  assertQuota,
  assertSlugLength,
  currentPeriod,
  getWorkspaceUsage,
} from "@/lib/quota";
import { QuotaError } from "@/lib/action-result";
import { resolveRange } from "@/lib/stats";
import { dispatchWebhook } from "@/lib/webhooks";
import { openApiDocument } from "./openapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Variables = { api: ApiContext };

const app = new Hono<{ Variables: Variables }>().basePath("/api/v1");

function errorBody(code: string, message: string, fields?: Record<string, string[]>) {
  return { error: { code, message, ...(fields ? { fields } : {}) } };
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
  const parsed = linkInputSchema.safeParse(await c.req.json().catch(() => ({})));
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

  const link = await createLink({
    workspaceId: context.workspace.id,
    creatorId: null,
    input,
  });
  const resource = serializeLink(link);

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
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
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
    expiresAt: existing.expiresAt,
    expiredDestination: existing.expiredDestination,
    iosDestination: existing.iosDestination,
    androidDestination: existing.androidDestination,
    cloaked: existing.cloaked,
    noIndex: existing.noIndex,
    forwardQuery: existing.forwardQuery,
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

  const link = await updateLink({ workspaceId: context.workspace.id, linkId: id, input });
  const resource = serializeLink(link);

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
  const { workspace } = c.get("api");
  const id = idParam.parse(c.req.param("id"));

  const link = await getLink(workspace.id, id);
  if (!link) {
    throw new ApiError(404, "not_found", "No link with that id on this account.");
  }

  const range = resolveRange(c.req.query("range"), c.req.query("from"), c.req.query("to"));
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
  const { workspace } = c.get("api");
  const range = resolveRange(c.req.query("range"), c.req.query("from"), c.req.query("to"));
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
  const parsed = domainInputSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    throw parsed.error;
  }
  await assertQuota(context.workspace.id, context.plan, "customDomains");
  const result = await addDomain(context.workspace.id, parsed.data);
  return c.json({ data: serializeDomain(result.domain) }, 201);
});

app.get("/qr-codes", async (c) => {
  const { workspace } = c.get("api");
  const { items, total } = await listQrCodes(workspace.id, 1, 100);
  return c.json({
    data: items.map(serializeQrCode),
    pagination: { page: 1, pageSize: 100, total },
  });
});

app.post("/qr-codes", async (c) => {
  const context = c.get("api");
  const parsed = qrInputSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    throw parsed.error;
  }
  await assertQuota(context.workspace.id, context.plan, "qrCodes");
  if (parsed.data.style.logoUrl) {
    assertFeature(context.plan, "qrLogo");
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
    ...(await c.req.json().catch(() => ({}))),
  });
  if (!parsed.success) {
    throw parsed.error;
  }
  const row = await updateQrCode(context.workspace.id, id, parsed.data);
  return c.json({ data: serializeQrCode(row) });
});

app.get("/biopages", async (c) => {
  const { workspace } = c.get("api");
  const { items, total } = await listBiopages(workspace.id, 1, 100);
  return c.json({
    data: items.map(serializeBiopage),
    pagination: { page: 1, pageSize: 100, total },
  });
});

app.post("/biopages", async (c) => {
  const context = c.get("api");
  const parsed = biopageInputSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    throw parsed.error;
  }
  await assertQuota(context.workspace.id, context.plan, "biopages");
  if (parsed.data.customCss.trim() !== "") {
    assertFeature(context.plan, "customCss");
  }
  if (parsed.data.blocks.some((block) => block.type === "form")) {
    assertFeature(context.plan, "bioForms");
  }
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
    ...(await c.req.json().catch(() => ({}))),
  });
  if (!parsed.success) {
    throw parsed.error;
  }
  if (parsed.data.customCss.trim() !== "") {
    assertFeature(context.plan, "customCss");
  }
  if (parsed.data.blocks.some((block) => block.type === "form")) {
    assertFeature(context.plan, "bioForms");
  }
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

  console.error("api/v1 failed", error);
  return c.json(errorBody("internal_error", "Something went wrong."), 500);
});

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);

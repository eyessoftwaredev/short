import { getPlan, type PlanDefinition } from "@short/core";
import { eq, getDb, organization, plans, subscriptions } from "@short/db";
import { auth } from "./auth";
import { rateLimit, type RateLimitResult } from "./redis";
import { getWorkspaceOwnerId } from "./workspace";

export type ApiContext = {
  keyId: string;
  keyName: string | null;
  workspace: { id: string; name: string; slug: string };
  plan: PlanDefinition;
};

export class ApiError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409 | 429 | 503,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function bearer(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const [scheme, value] = header.split(" ");
  if (scheme?.toLowerCase() === "bearer" && value) {
    return value;
  }
  return null;
}

/**
 * Resolves an `x-api-key` (or bearer) header into a workspace-scoped context. Keys are
 * issued against a workspace, so `referenceId` is the workspace id.
 */
export async function resolveApiContext(headers: Headers): Promise<ApiContext> {
  const raw = headers.get("x-api-key") ?? bearer(headers.get("authorization"));
  if (!raw) {
    throw new ApiError(401, "missing_api_key", "Provide your key in the x-api-key header.");
  }

  const result = await auth.api.verifyApiKey({ body: { key: raw } });
  if (!result.valid || !result.key) {
    const message =
      typeof result.error?.message === "string" ? result.error.message : "API key is not valid.";
    throw new ApiError(401, "invalid_api_key", message);
  }

  const db = getDb();
  const [workspace] = await db
    .select({ id: organization.id, name: organization.name, slug: organization.slug })
    .from(organization)
    .where(eq(organization.id, result.key.referenceId))
    .limit(1);

  if (!workspace) {
    throw new ApiError(403, "no_access", "The workspace this key belongs to no longer exists.");
  }

  const ownerId = await getWorkspaceOwnerId(workspace.id);
  const [row] = ownerId
    ? await db
        .select({
          planKey: subscriptions.planKey,
          limits: plans.limits,
          features: plans.features,
          name: plans.name,
        })
        .from(subscriptions)
        .leftJoin(plans, eq(subscriptions.planKey, plans.key))
        .where(eq(subscriptions.userId, ownerId))
        .limit(1)
    : [];

  const base = getPlan(row?.planKey ?? "free");
  const plan: PlanDefinition = row
    ? {
        ...base,
        name: row.name ?? base.name,
        limits: { ...base.limits, ...(row.limits ?? {}) },
        features: { ...base.features, ...(row.features ?? {}) },
      }
    : base;

  if (!plan.features.apiAccess) {
    throw new ApiError(403, "plan_required", `The ${plan.name} plan does not include API access.`);
  }

  return { keyId: result.key.id, keyName: result.key.name, workspace, plan };
}

/** Hourly window keyed on the API key, with the ceiling taken from the plan. */
export async function checkApiRateLimit(context: ApiContext): Promise<RateLimitResult> {
  const limit = context.plan.limits.apiRequestsPerHour;
  if (limit === -1) {
    return { allowed: true, remaining: -1, resetAt: Date.now() + 3600_000 };
  }
  return rateLimit(`api:${context.keyId}`, limit, 3600);
}

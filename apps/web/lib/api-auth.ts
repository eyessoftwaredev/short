import { createHash, timingSafeEqual } from "node:crypto";
import { getPlan, type PlanDefinition } from "@short/core";
import { eq, getDb, organization, plans, subscriptions, user } from "@short/db";
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

/**
 * Constant-time check of an `authorization: Bearer <secret>` header for the internal and
 * cron endpoints. Both sides are hashed first so a length mismatch leaks nothing, and an
 * empty expected secret never matches.
 */
export function hasBearerSecret(headers: Headers, expected: string | null | undefined): boolean {
  const token = bearer(headers.get("authorization"));
  if (!token || !expected) {
    return false;
  }
  const left = createHash("sha256").update(token).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

function bearer(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const match = /^bearer\s+(\S+)\s*$/i.exec(header.trim());
  return match?.[1] ?? null;
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

  const result = await auth.api
    .verifyApiKey({ body: { key: raw } })
    .catch(() => ({ valid: false as const, key: null, error: null }));
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

  // Keys outlive the session that minted them, so a banned or closed billing owner has
  // to be checked here; better-auth only checks the key row itself.
  const ownerId = await getWorkspaceOwnerId(workspace.id);
  if (!ownerId) {
    throw new ApiError(403, "no_access", "The workspace this key belongs to has no owner.");
  }
  const [owner] = await db
    .select({ banned: user.banned, banExpires: user.banExpires, deactivatedAt: user.deactivatedAt })
    .from(user)
    .where(eq(user.id, ownerId))
    .limit(1);
  const banActive =
    owner?.banned === true && (!owner.banExpires || owner.banExpires.getTime() > Date.now());
  if (!owner || banActive || owner.deactivatedAt) {
    throw new ApiError(403, "account_suspended", "The account that owns this workspace is suspended.");
  }

  const [row] = await db
    .select({
      planKey: subscriptions.planKey,
      limits: plans.limits,
      features: plans.features,
      name: plans.name,
    })
    .from(subscriptions)
    .leftJoin(plans, eq(subscriptions.planKey, plans.key))
    .where(eq(subscriptions.userId, ownerId))
    .limit(1);

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

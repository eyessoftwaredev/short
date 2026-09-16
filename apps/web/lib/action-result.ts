import { z } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/** Turns a Zod failure into the field-level shape the forms render inline. */
export function fromZodError(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_form";
    fieldErrors[path] = [...(fieldErrors[path] ?? []), issue.message];
  }
  return { ok: false, error: "validation", fieldErrors };
}

/** Thrown by quota and feature guards; surfaced to the user as an upgrade prompt. */
export class QuotaError extends Error {
  constructor(
    message: string,
    readonly resource: string,
  ) {
    super(message);
    this.name = "QuotaError";
  }
}

export function toActionError(error: unknown): ActionResult<never> {
  if (error instanceof QuotaError) {
    if (error.resource === "teams") {
      return fail("quota_teams");
    }
    if (error.resource === "members") {
      return fail("quota_members");
    }
    if (
      error.resource === "slug_too_short" ||
      error.resource === "slug_premium" ||
      error.resource === "handle_too_short" ||
      error.resource === "handle_premium"
    ) {
      return fail(error.resource);
    }
    return fail("quota");
  }
  if (error instanceof z.ZodError) {
    return fromZodError(error);
  }
  console.error("server action failed", error);
  return fail("generic");
}

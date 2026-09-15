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
  return { ok: false, error: "Please fix the highlighted fields", fieldErrors };
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
    return fail(error.message);
  }
  if (error instanceof z.ZodError) {
    return fromZodError(error);
  }
  console.error("server action failed", error);
  return fail("Something went wrong. Try again.");
}

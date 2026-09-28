import { evaluateSlugLength, handleSchema, slugify, type PlanDefinition } from "@short/core";
import { handleTaken } from "@/lib/biopages";

/**
 * Server-side answers for the handle field: the same rules the save action enforces
 * (format, reserved words, plan length limits, uniqueness per host), evaluated early so
 * the builder can say "available" or "taken" while the user is still typing.
 */
export type HandleStatus =
  | "available"
  | "current"
  | "empty"
  | "invalid"
  | "reserved"
  | "too_short"
  | "premium"
  | "taken";

type HandleContext = {
  domainId: string | null;
  /** The page being edited: its own handle is not "taken". */
  exceptId?: string;
  /** The saved handle of that page; keeping it skips the plan length check. */
  previous?: string | null;
  /** Saved handle when the host is unchanged too, i.e. nothing would move. */
  current?: string | null;
  plan: PlanDefinition;
  isSuperadmin: boolean;
};

export async function handleStatus(raw: string, context: HandleContext): Promise<HandleStatus> {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return "empty";
  }
  const parsed = handleSchema.safeParse(trimmed);
  if (!parsed.success) {
    const reserved = parsed.error.issues.some((issue) => issue.message === "handleReserved");
    return reserved ? "reserved" : "invalid";
  }
  const handle = parsed.data;
  if (context.current && context.current === handle) {
    return "current";
  }
  const length = evaluateSlugLength({
    slug: handle,
    shortSlugs: context.plan.features.shortSlugs,
    isSuperadmin: context.isSuperadmin,
    previous: context.previous,
  });
  if (!length.ok) {
    return length.reason;
  }
  if (await handleTaken(handle, context.domainId, context.exceptId)) {
    return "taken";
  }
  return "available";
}

/**
 * First free handle derived from `base`: the base itself, then `base-bio`, then
 * numbered variants. Short bases are lengthened so a free plan never gets a suggestion
 * that its own length rule would reject.
 */
export async function suggestHandle(base: string, context: HandleContext): Promise<string | null> {
  const root = slugify(base, 40).replace(/^[^a-z0-9]+/, "") || "my-page";
  const candidates = [root, `${root}-bio`, `${root}-page`];
  for (let index = 2; index <= 9; index += 1) {
    candidates.push(`${root}-${index}`);
  }
  for (const candidate of candidates) {
    const status = await handleStatus(candidate, { ...context, previous: null, current: null });
    if (status === "available") {
      return candidate;
    }
  }
  return null;
}

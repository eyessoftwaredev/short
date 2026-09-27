/**
 * True when a query failed on a unique index. Drizzle wraps driver errors in
 * `DrizzleQueryError`, so the Postgres SQLSTATE lives on `cause`, not on the error.
 */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 3 && typeof current === "object" && current !== null; depth += 1) {
    if ((current as { code?: unknown }).code === "23505") {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

export { getDb, getSql, schema, type Database } from "./client";
export { applyMigrations } from "./migrate";
export { isUniqueViolation } from "./errors";
export {
  PLATFORM_WORKSPACE_ID,
  ensurePlatformDomain,
  normalizePlatformHostname,
} from "./platform-domain";
export * from "./schema";
export {
  aliasedTable,
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";

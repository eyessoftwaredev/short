export { getDb, getSql, schema, type Database } from "./client";
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

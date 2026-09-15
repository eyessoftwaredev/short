import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

/** Reused across hot reloads so dev does not exhaust the Postgres connection slots. */
const globalForDb = globalThis as unknown as {
  __shortSql?: postgres.Sql;
  __shortDb?: Database;
};

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

export function getSql(): postgres.Sql {
  if (!globalForDb.__shortSql) {
    globalForDb.__shortSql = postgres(connectionString(), {
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
  }
  return globalForDb.__shortSql;
}

export function getDb(): Database {
  if (!globalForDb.__shortDb) {
    globalForDb.__shortDb = drizzle(getSql(), { schema });
  }
  return globalForDb.__shortDb;
}

export { schema };

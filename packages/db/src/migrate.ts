import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { existsSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

/** Arbitrary constant shared by every process that runs `applyMigrations`. */
const MIGRATION_LOCK_KEY = 72_531_904;

function resolveMigrationsFolder(): string {
  const candidates = [
    process.env.MIGRATIONS_DIR,
    path.join(process.env.APP_ROOT ?? "/app", "packages/db/drizzle"),
    path.join(process.cwd(), "packages/db/drizzle"),
  ].filter((value): value is string => Boolean(value));

  for (const folder of candidates) {
    if (existsSync(path.join(folder, "meta/_journal.json"))) {
      return folder;
    }
  }

  throw new Error("Migrations folder not found");
}

export async function applyMigrations(
  databaseUrl: string,
  migrationsFolder = resolveMigrationsFolder(),
): Promise<void> {
  // max: 1 keeps the advisory lock and the migration transaction on the same session.
  const connection = postgres(databaseUrl, { max: 1, prepare: false });

  try {
    // Two replicas (rolling deploy) or the cron route racing the pre-deploy migrator would
    // otherwise both read the same "last applied" row and apply a migration twice.
    await connection`select pg_advisory_lock(${MIGRATION_LOCK_KEY}::bigint)`;
    const db = drizzle(connection);
    await migrate(db, { migrationsFolder });
    await connection`select pg_advisory_unlock(${MIGRATION_LOCK_KEY}::bigint)`;
  } finally {
    await connection.end({ timeout: 5 });
  }
}

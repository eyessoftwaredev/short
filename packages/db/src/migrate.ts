import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { existsSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

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
  const connection = postgres(databaseUrl, { max: 1, prepare: false });

  try {
    const db = drizzle(connection);
    await migrate(db, { migrationsFolder });
  } finally {
    await connection.end({ timeout: 5 });
  }
}

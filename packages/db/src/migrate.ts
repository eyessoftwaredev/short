import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";
import postgres from "postgres";

export async function applyMigrations(
  databaseUrl: string,
  migrationsFolder = path.join(process.cwd(), "packages/db/drizzle"),
): Promise<void> {
  const connection = postgres(databaseUrl, { max: 1, prepare: false });

  try {
    const db = drizzle(connection);
    await migrate(db, { migrationsFolder });
  } finally {
    await connection.end({ timeout: 5 });
  }
}

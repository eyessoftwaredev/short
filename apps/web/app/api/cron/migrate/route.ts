import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { NextResponse, type NextRequest } from "next/server";
import path from "node:path";
import postgres from "postgres";
import { serverEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Applies pending Drizzle migrations. Trigger after deploy with CRON_SECRET:
 * curl -X POST http://127.0.0.1:3000/api/cron/migrate -H "Authorization: Bearer …"
 */
export async function POST(request: NextRequest) {
  const env = serverEnv();
  const expected = env.CRON_SECRET ?? env.INTERNAL_TOKEN;

  if (request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const connection = postgres(env.DATABASE_URL, { max: 1, prepare: false });

  try {
    const db = drizzle(connection);
    const migrationsFolder = path.join(process.cwd(), "packages/db/drizzle");
    await migrate(db, { migrationsFolder });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("migrate failed", error);
    return NextResponse.json({ error: "migrate_failed" }, { status: 500 });
  } finally {
    await connection.end({ timeout: 5 });
  }
}

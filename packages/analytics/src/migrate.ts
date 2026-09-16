import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { createClient } from "@clickhouse/client";
import { DDL_STATEMENTS } from "./ddl";

// Same reason as packages/db: cwd is this package, but .env lives at the repo root.
loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env") });

/**
 * Replays the whole DDL list. Every statement is `IF NOT EXISTS`, so this is safe to
 * run on every deploy. The database itself is created first because the pooled client
 * in `client.ts` assumes it already exists.
 */
async function main(): Promise<void> {
  const database = process.env.CLICKHOUSE_DATABASE ?? "short";
  const connection = {
    url: process.env.CLICKHOUSE_URL ?? "http://localhost:8123",
    username: process.env.CLICKHOUSE_USER ?? "default",
    password: process.env.CLICKHOUSE_PASSWORD ?? "",
  };

  const bootstrap = createClient(connection);
  await bootstrap.command({ query: `CREATE DATABASE IF NOT EXISTS ${database}` });
  await bootstrap.close();

  const client = createClient({ ...connection, database });
  try {
    for (const [index, statement] of DDL_STATEMENTS.entries()) {
      await client.command({ query: statement });
      console.log(`[${index + 1}/${DDL_STATEMENTS.length}] applied`);
    }
    console.log(`ClickHouse schema ready in database "${database}"`);
  } finally {
    await client.close();
  }
}

try {
  await main();
} catch (error) {
  console.error("ClickHouse migration failed:", error);
  process.exitCode = 1;
}

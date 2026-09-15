import { createClient, type ClickHouseClient } from "@clickhouse/client";

const globalForCh = globalThis as unknown as { __shortCh?: ClickHouseClient };

export function getClickhouse(): ClickHouseClient {
  if (!globalForCh.__shortCh) {
    globalForCh.__shortCh = createClient({
      url: process.env.CLICKHOUSE_URL ?? "http://localhost:8123",
      username: process.env.CLICKHOUSE_USER ?? "default",
      password: process.env.CLICKHOUSE_PASSWORD ?? "",
      database: process.env.CLICKHOUSE_DATABASE ?? "short",
      request_timeout: 30_000,
      clickhouse_settings: {
        // Panel queries tolerate slightly stale reads in exchange for not blocking on merges.
        max_execution_time: 20,
      },
    });
  }
  return globalForCh.__shortCh;
}

export type QueryParams = Record<string, string | number | boolean | string[] | Date>;

/** Runs a parameterised query. Always use `{name:Type}` placeholders, never string interpolation. */
export async function chQuery<T>(query: string, query_params: QueryParams = {}): Promise<T[]> {
  const resultSet = await getClickhouse().query({
    query,
    query_params,
    format: "JSONEachRow",
  });
  return resultSet.json<T>();
}

export async function chPing(): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await getClickhouse().ping();
    return result.success ? { ok: true } : { ok: false, error: String(result.error?.message ?? "") };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

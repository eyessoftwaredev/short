import { toJsonEachRow, type TrackedEvent } from "@short/core";

export type IngestEnv = {
  /** Base URL of the ClickHouse HTTP interface, e.g. https://clickhouse.internal:8123 */
  CLICKHOUSE_URL: string;
  CLICKHOUSE_DATABASE: string;
  CLICKHOUSE_USER: string;
  CLICKHOUSE_PASSWORD: string;
  /** Optional dead-letter sink for batches ClickHouse keeps rejecting. */
  FAILED_EVENTS?: R2Bucket;
  /** Panel origin used to relay click events to customer webhooks. */
  ORIGIN_URL?: string;
  INTERNAL_TOKEN?: string;
};

const INSERT_QUERY = "INSERT INTO events FORMAT JSONEachRow";

async function insertBatch(env: IngestEnv, events: TrackedEvent[]): Promise<void> {
  const url = new URL(env.CLICKHOUSE_URL);
  url.searchParams.set("query", INSERT_QUERY);
  url.searchParams.set("database", env.CLICKHOUSE_DATABASE);
  // Let ClickHouse coalesce small batches from many workers into large parts.
  url.searchParams.set("async_insert", "1");
  url.searchParams.set("wait_for_async_insert", "1");
  url.searchParams.set("date_time_input_format", "best_effort");

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-clickhouse-user": env.CLICKHOUSE_USER,
      "x-clickhouse-key": env.CLICKHOUSE_PASSWORD,
    },
    body: toJsonEachRow(events),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ClickHouse insert failed (${response.status}): ${detail.slice(0, 500)}`);
  }
}

/**
 * Last resort for a batch that has exhausted its retries. Writing the raw payload to R2
 * keeps the events replayable instead of silently dropping them.
 */
async function archiveFailure(env: IngestEnv, events: TrackedEvent[], reason: string): Promise<void> {
  if (!env.FAILED_EVENTS) {
    return;
  }
  const key = `failed/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.ndjson`;
  await env.FAILED_EVENTS.put(key, toJsonEachRow(events), {
    customMetadata: { reason: reason.slice(0, 900), count: String(events.length) },
  });
}

/**
 * `link.clicked` / `biopage.viewed` webhooks cannot be dispatched from the panel, so the
 * batch is handed to the origin after it is safely in ClickHouse. Failures are logged and
 * ignored: analytics is the contract, webhook delivery is best-effort.
 */
async function relayToOrigin(env: IngestEnv, events: TrackedEvent[]): Promise<void> {
  if (!env.ORIGIN_URL || !env.INTERNAL_TOKEN) {
    return;
  }

  try {
    const response = await fetch(new URL("/api/internal/events", env.ORIGIN_URL), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.INTERNAL_TOKEN}`,
      },
      body: JSON.stringify({ events }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error(`webhook relay rejected the batch (${response.status})`);
    }
  } catch (error) {
    console.error("webhook relay failed", error instanceof Error ? error.message : error);
  }
}

export default {
  async queue(
    batch: MessageBatch<TrackedEvent>,
    env: IngestEnv,
    ctx: ExecutionContext,
  ): Promise<void> {
    if (batch.messages.length === 0) {
      return;
    }

    const events = batch.messages.map((message) => message.body);

    try {
      await insertBatch(env, events);
      batch.ackAll();
      ctx.waitUntil(relayToOrigin(env, events));
      return;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(`ingest batch of ${events.length} failed: ${reason}`);

      // Messages already at the retry ceiling would be dropped by the queue, so archive
      // them here; everything else goes back for another attempt with backoff.
      const exhausted = batch.messages.filter((message) => message.attempts >= 3);
      if (exhausted.length > 0) {
        await archiveFailure(
          env,
          exhausted.map((message) => message.body),
          reason,
        );
        for (const message of exhausted) {
          message.ack();
        }
      }

      for (const message of batch.messages) {
        if (message.attempts < 3) {
          message.retry({ delaySeconds: Math.min(60, 2 ** message.attempts * 5) });
        }
      }
    }
  },
} satisfies ExportedHandler<IngestEnv, TrackedEvent>;

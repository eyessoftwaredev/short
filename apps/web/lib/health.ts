import { chPing } from "@short/analytics";
import { getSql } from "@short/db";
import { features, serverEnv } from "./env";
import { getRedis } from "./redis";

export type HealthState = "ok" | "degraded" | "down" | "disabled";

export type HealthCheck = {
  id: string;
  label: string;
  state: HealthState;
  detail: string;
  /** Round-trip in milliseconds, null when the check did not run. */
  latencyMs: number | null;
};

async function timed(
  id: string,
  label: string,
  probe: () => Promise<string>,
): Promise<HealthCheck> {
  const started = Date.now();
  try {
    const detail = await probe();
    const latencyMs = Date.now() - started;
    return {
      id,
      label,
      // A slow dependency is worth surfacing before it starts failing outright.
      state: latencyMs > 1500 ? "degraded" : "ok",
      detail,
      latencyMs,
    };
  } catch (error) {
    return {
      id,
      label,
      state: "down",
      detail: error instanceof Error ? error.message : "Unreachable",
      latencyMs: Date.now() - started,
    };
  }
}

function disabled(id: string, label: string, detail: string): HealthCheck {
  return { id, label, state: "disabled", detail, latencyMs: null };
}

async function checkPostgres(): Promise<HealthCheck> {
  return timed("postgres", "Postgres", async () => {
    const rows = await getSql()<{ version: string }[]>`SELECT version() AS version`;
    return rows[0]?.version.split(" ").slice(0, 2).join(" ") ?? "connected";
  });
}

async function checkClickhouse(): Promise<HealthCheck> {
  return timed("clickhouse", "ClickHouse", async () => {
    const result = await chPing();
    if (!result.ok) {
      throw new Error(result.error ?? "Ping failed");
    }
    return serverEnv().CLICKHOUSE_DATABASE;
  });
}

async function checkRedis(): Promise<HealthCheck> {
  if (!features().redis) {
    return disabled("redis", "Redis", "REDIS_URL not set — rate limits fail open");
  }
  return timed("redis", "Redis", async () => {
    const redis = getRedis();
    if (!redis) {
      throw new Error("Client unavailable");
    }
    return await redis.ping();
  });
}

async function checkKv(): Promise<HealthCheck> {
  if (!features().cloudflare) {
    return disabled("kv", "Workers KV", "Cloudflare credentials not set — edge cache disabled");
  }
  const env = serverEnv();
  return timed("kv", "Workers KV", async () => {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/storage/kv/namespaces/${env.CF_KV_NAMESPACE_ID}`,
      { headers: { authorization: `Bearer ${env.CF_API_TOKEN}` }, signal: AbortSignal.timeout(6000) },
    );
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    const body = (await response.json()) as { result?: { title?: string } };
    return body.result?.title ?? "namespace reachable";
  });
}

async function checkStripe(): Promise<HealthCheck> {
  if (!features().stripe) {
    return disabled("stripe", "Stripe", "Keys not set — billing disabled");
  }
  return timed("stripe", "Stripe", async () => {
    const { getStripe } = await import("./stripe");
    const balance = await getStripe().balance.retrieve();
    return balance.livemode ? "live mode" : "test mode";
  });
}

function checkEmail(): HealthCheck {
  return features().email
    ? { id: "email", label: "Email (Resend)", state: "ok", detail: "API key configured", latencyMs: null }
    : disabled("email", "Email (Resend)", "RESEND_API_KEY not set — mail is logged only");
}

export async function runHealthChecks(): Promise<HealthCheck[]> {
  const [postgres, clickhouse, redis, kv, stripe] = await Promise.all([
    checkPostgres(),
    checkClickhouse(),
    checkRedis(),
    checkKv(),
    checkStripe(),
  ]);

  return [postgres, clickhouse, redis, kv, stripe, checkEmail()];
}

export type IngestLag = {
  lastEventAt: Date | null;
  lagSeconds: number | null;
  eventsLastHour: number;
};

/**
 * Queue depth is not readable from the API, so the freshness of the newest row in
 * ClickHouse is used as the lag signal for the worker -> queue -> ingest path.
 */
export async function getIngestLag(): Promise<IngestLag> {
  try {
    const { chQuery } = await import("@short/analytics");
    const [row] = await chQuery<{ last: string; recent: string }>(
      `SELECT max(ts) AS last,
              countIf(ts >= now() - INTERVAL 1 HOUR) AS recent
       FROM events`,
    );

    if (!row || row.last.startsWith("1970")) {
      return { lastEventAt: null, lagSeconds: null, eventsLastHour: 0 };
    }

    const lastEventAt = new Date(`${row.last.replace(" ", "T")}Z`);
    return {
      lastEventAt,
      lagSeconds: Math.max(0, Math.round((Date.now() - lastEventAt.getTime()) / 1000)),
      eventsLastHour: Number(row.recent),
    };
  } catch (error) {
    console.error("getIngestLag failed", error);
    return { lastEventAt: null, lagSeconds: null, eventsLastHour: 0 };
  }
}

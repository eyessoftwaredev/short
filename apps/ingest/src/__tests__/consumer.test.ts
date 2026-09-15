import { emptyEvent, type TrackedEvent } from "@short/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import consumer, { type IngestEnv } from "../index";

function event(overrides: Partial<TrackedEvent> = {}): TrackedEvent {
  return {
    ...emptyEvent(),
    eventId: crypto.randomUUID(),
    workspaceId: "ws_1",
    linkId: "lnk_1",
    ts: "2026-09-14T10:00:00.000Z",
    ...overrides,
  };
}

type FakeMessage = {
  body: TrackedEvent;
  attempts: number;
  acked: boolean;
  retried: number | null;
  ack: () => void;
  retry: (options?: { delaySeconds?: number }) => void;
};

function message(body: TrackedEvent, attempts = 1): FakeMessage {
  const fake: FakeMessage = {
    body,
    attempts,
    acked: false,
    retried: null,
    ack() {
      fake.acked = true;
    },
    retry(options) {
      fake.retried = options?.delaySeconds ?? 0;
    },
  };
  return fake;
}

function batch(messages: FakeMessage[]) {
  let ackedAll = false;
  return {
    batch: {
      messages,
      queue: "short-clicks",
      ackAll() {
        ackedAll = true;
      },
      retryAll() {},
    } as unknown as MessageBatch<TrackedEvent>,
    get ackedAll() {
      return ackedAll;
    },
  };
}

function ctx() {
  const pending: Promise<unknown>[] = [];
  return {
    ctx: {
      waitUntil(promise: Promise<unknown>) {
        pending.push(promise);
      },
      passThroughOnException() {},
      props: {},
    } as ExecutionContext,
    settled: () => Promise.allSettled(pending),
  };
}

const archive: { key: string; body: string; metadata: unknown }[] = [];

const env: IngestEnv = {
  CLICKHOUSE_URL: "https://ch.test",
  CLICKHOUSE_DATABASE: "short",
  CLICKHOUSE_USER: "short_ingest",
  CLICKHOUSE_PASSWORD: "secret",
  FAILED_EVENTS: {
    async put(key: string, body: string, options: unknown) {
      archive.push({ key, body, metadata: options });
    },
  } as unknown as R2Bucket,
  ORIGIN_URL: "https://app.test",
  INTERNAL_TOKEN: "internal-token",
};

beforeEach(() => {
  archive.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Typed so `mock.calls` keeps the argument tuple instead of collapsing to `[]`. */
function okFetch() {
  return vi.fn(
    async (_input: string | URL | Request, _init?: RequestInit) => new Response("", { status: 200 }),
  );
}

describe("successful batch", () => {
  it("posts JSONEachRow with async inserts enabled and acks the batch", async () => {
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);

    const group = batch([message(event({ linkId: "a" })), message(event({ linkId: "b" }))]);
    const scope = ctx();
    await consumer.queue(group.batch, env, scope.ctx);

    expect(group.ackedAll).toBe(true);

    const [url, init = {}] = fetchMock.mock.calls[0] ?? [];
    const parsed = new URL(String(url));
    expect(parsed.searchParams.get("query")).toBe("INSERT INTO events FORMAT JSONEachRow");
    expect(parsed.searchParams.get("async_insert")).toBe("1");
    expect(parsed.searchParams.get("database")).toBe("short");

    const headers = init.headers as Record<string, string>;
    expect(headers["x-clickhouse-key"]).toBe("secret");

    // One JSON object per line, snake_cased into the ClickHouse column names.
    const lines = String(init.body).split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0] ?? "{}")).toMatchObject({
      link_id: "a",
      workspace_id: "ws_1",
      ts: "2026-09-14 10:00:00.000",
    });
  });

  it("relays the batch to the panel for webhook fan-out", async () => {
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);

    const scope = ctx();
    await consumer.queue(batch([message(event())]).batch, env, scope.ctx);
    await scope.settled();

    const relay = fetchMock.mock.calls.find(([target]) =>
      String(target).includes("/api/internal/events"),
    );
    expect(relay).toBeDefined();
    const headers = (relay?.[1]?.headers ?? {}) as Record<string, string>;
    expect(headers.authorization).toBe("Bearer internal-token");
  });

  it("skips the relay when the origin is not configured", async () => {
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);

    const scope = ctx();
    const { ORIGIN_URL: _origin, INTERNAL_TOKEN: _token, ...withoutOrigin } = env;
    await consumer.queue(batch([message(event())]).batch, withoutOrigin, scope.ctx);
    await scope.settled();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("failed batch", () => {
  it("retries with exponential backoff while attempts remain", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("too many parts", { status: 500 })),
    );

    const first = message(event(), 1);
    const second = message(event(), 2);
    const group = batch([first, second]);
    const scope = ctx();

    await consumer.queue(group.batch, env, scope.ctx);

    expect(group.ackedAll).toBe(false);
    expect(first.retried).toBe(10);
    expect(second.retried).toBe(20);
    expect(archive).toHaveLength(0);
  });

  it("archives messages that exhausted their retries instead of dropping them", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("clickhouse unreachable");
      }),
    );

    const exhausted = message(event(), 3);
    const scope = ctx();
    await consumer.queue(batch([exhausted]).batch, env, scope.ctx);

    expect(exhausted.acked).toBe(true);
    expect(archive).toHaveLength(1);
    expect(archive[0]?.key).toMatch(/^failed\/\d{4}-\d{2}-\d{2}\/.+\.ndjson$/);
    expect(JSON.parse(archive[0]?.body ?? "{}")).toMatchObject({ workspace_id: "ws_1" });
  });
});

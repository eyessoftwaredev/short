import {
  KV_SCHEMA_VERSION,
  biopageKey,
  domainKey,
  linkKey,
  type BiopageKvRecord,
  type DomainKvRecord,
  type LinkKvRecord,
  type TrackedEvent,
} from "@short/core";
import type { EdgeEnv } from "../env";

/**
 * Minimal stand-ins for the three bindings the worker uses. Only the methods the worker
 * actually calls are implemented, so an accidental new dependency on the KV or queue API
 * surfaces as a test failure rather than passing silently.
 */
export type FakeKv = {
  store: Map<string, string>;
  puts: string[];
  get: (key: string, type?: string) => Promise<unknown>;
  put: (key: string, value: string, options?: unknown) => Promise<void>;
};

export function fakeKv(seed: Record<string, unknown> = {}): FakeKv {
  const store = new Map<string, string>(
    Object.entries(seed).map(([key, value]) => [key, JSON.stringify(value)]),
  );
  const puts: string[] = [];

  return {
    store,
    puts,
    async get(key) {
      const raw = store.get(key);
      return raw === undefined ? null : JSON.parse(raw);
    },
    async put(key, value) {
      store.set(key, value);
      puts.push(key);
    },
  };
}

export type FakeQueue = { sent: TrackedEvent[]; send: (event: TrackedEvent) => Promise<void> };

export function fakeQueue(): FakeQueue {
  const sent: TrackedEvent[] = [];
  return {
    sent,
    async send(event) {
      sent.push(event);
    },
  };
}

/** Collects `waitUntil` promises so a test can await the tracking side effects. */
export type FakeCtx = ExecutionContext & { settled: () => Promise<void> };

export function fakeCtx(): FakeCtx {
  const pending: Promise<unknown>[] = [];
  return {
    waitUntil(promise: Promise<unknown>) {
      pending.push(promise);
    },
    passThroughOnException() {},
    props: {},
    async settled() {
      await Promise.allSettled(pending);
    },
  } as FakeCtx;
}

export function makeEnv(kv: FakeKv, queue: FakeQueue): EdgeEnv {
  return {
    LINKS: kv as unknown as KVNamespace,
    CLICK_QUEUE: queue as unknown as Queue<TrackedEvent>,
    ORIGIN_URL: "https://app.test",
    DEFAULT_NOT_FOUND: "https://short.test/404",
    KV_TTL_SECONDS: "3600",
    INTERNAL_TOKEN: "internal-token",
    VISITOR_SALT: "salt",
  };
}

export function domainRecord(overrides: Partial<DomainKvRecord> = {}): DomainKvRecord {
  return {
    v: KV_SCHEMA_VERSION,
    id: "dom_1",
    workspaceId: "ws_1",
    hostname: "go.test",
    status: "active",
    rootDestination: null,
    notFoundDestination: null,
    ...overrides,
  };
}

export function linkRecord(overrides: Partial<LinkKvRecord> = {}): LinkKvRecord {
  return {
    v: KV_SCHEMA_VERSION,
    id: "lnk_1",
    workspaceId: "ws_1",
    hostname: "go.test",
    slug: "promo",
    destination: "https://example.com/landing",
    rules: [],
    abVariants: [],
    utm: null,
    expiresAt: null,
    expiredDestination: null,
    passwordHash: null,
    iosDestination: null,
    androidDestination: null,
    cloaked: false,
    noIndex: false,
    forwardQuery: false,
    disabled: false,
    title: null,
    description: null,
    image: null,
    ...overrides,
  };
}

export function biopageRecord(overrides: Partial<BiopageKvRecord> = {}): BiopageKvRecord {
  return {
    v: KV_SCHEMA_VERSION,
    id: "bio_1",
    workspaceId: "ws_1",
    handle: "acme",
    published: true,
    ...overrides,
  };
}

export const keys = { linkKey, domainKey, biopageKey };

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  cf?: Partial<IncomingRequestCfProperties>;
  body?: BodyInit;
};

export function edgeRequest(
  url: string,
  options: RequestOptions = {},
): Request<unknown, IncomingRequestCfProperties> {
  const request = new Request(url, {
    method: options.method ?? "GET",
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
      "cf-connecting-ip": "203.0.113.10",
      ...options.headers,
    },
    body: options.body,
  });

  // `request.cf` is read-only on the real Workers Request, so it is attached here.
  Object.defineProperty(request, "cf", {
    value: { country: "TR", continent: "AS", city: "Istanbul", colo: "IST", ...options.cf },
  });

  return request as Request<unknown, IncomingRequestCfProperties>;
}

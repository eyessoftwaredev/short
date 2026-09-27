import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import type { WebhookEvent } from "@short/core";
import {
  and,
  desc,
  eq,
  getDb,
  webhookDeliveries,
  webhooks,
  type WebhookRow,
} from "@short/db";
import { cacheDelete, cacheGet, cacheSet } from "./redis";
import { decryptSecret, encryptSecret } from "./secret";

export type WebhookWithStats = WebhookRow & {
  lastDeliveryAt: Date | null;
  lastStatus: number | null;
  lastError: string | null;
};

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 8000;
/** Endpoint error bodies are stored and shown in settings; keep them short. */
const MAX_ERROR_LENGTH = 1000;

/**
 * Loopback, RFC 1918, link-local (incl. cloud metadata at 169.254.169.254), CGNAT,
 * multicast/reserved and their IPv6 equivalents. IPv4-mapped IPv6 addresses are matched
 * against the IPv4 ranges by `BlockList` itself.
 */
const PRIVATE_RANGES = (() => {
  const list = new BlockList();
  for (const [network, prefix] of [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
  ] as const) {
    list.addSubnet(network, prefix, "ipv4");
  }
  for (const [network, prefix] of [
    ["::", 128],
    ["::1", 128],
    ["64:ff9b::", 96],
    ["100::", 64],
    ["2001:db8::", 32],
    ["fc00::", 7],
    ["fe80::", 10],
    ["ff00::", 8],
  ] as const) {
    list.addSubnet(network, prefix, "ipv6");
  }
  return list;
})();

export class WebhookUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookUrlError";
  }
}

function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) {
    return true;
  }
  return PRIVATE_RANGES.check(address, family === 4 ? "ipv4" : "ipv6");
}

/**
 * SSRF guard for customer-supplied endpoints: http(s) only, and every address the host
 * resolves to must be public. Call it when an endpoint is saved and again before each
 * delivery, since DNS can change after the URL was accepted.
 */
export async function assertPublicWebhookUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new WebhookUrlError("Webhook URL is not valid");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new WebhookUrlError("Webhook URL must use http or https");
  }
  if (url.username || url.password) {
    throw new WebhookUrlError("Webhook URL must not contain credentials");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [host]
    : await lookup(host, { all: true, verbatim: true })
        .then((rows) => rows.map((row) => row.address))
        .catch(() => {
          throw new WebhookUrlError("Webhook host does not resolve");
        });

  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new WebhookUrlError("Webhook URL must point to a public address");
  }
  return url;
}

export function generateWebhookSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `whsec_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

const PLAINTEXT_SECRET_PREFIX = "whsec_";

/**
 * Signing secrets are encrypted at rest with `SECRET_ENCRYPTION_KEY`. Persist the value
 * returned here, and hand the caller the plaintext from `generateWebhookSecret` once.
 */
export function sealWebhookSecret(plain: string): string {
  return encryptSecret(plain);
}

/** Rows written before encryption hold the plaintext `whsec_…` value and keep working. */
export function openWebhookSecret(stored: string): string {
  return stored.startsWith(PLAINTEXT_SECRET_PREFIX) ? stored : decryptSecret(stored);
}

async function sign(secret: string, timestamp: number, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  const hex = Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `t=${timestamp},v1=${hex}`;
}

export async function listWebhooks(workspaceId: string): Promise<WebhookWithStats[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.workspaceId, workspaceId))
    .orderBy(desc(webhooks.createdAt));

  return Promise.all(
    rows.map(async (row) => {
      const [last] = await db
        .select()
        .from(webhookDeliveries)
        .where(eq(webhookDeliveries.webhookId, row.id))
        .orderBy(desc(webhookDeliveries.createdAt))
        .limit(1);

      return {
        ...row,
        lastDeliveryAt: last?.deliveredAt ?? last?.createdAt ?? null,
        lastStatus: last?.responseStatus ?? null,
        lastError: last?.error ?? null,
      };
    }),
  );
}

type DeliveryTarget = { id: string; url: string; secret: string };

/**
 * Posts one event to one endpoint with bounded retries. Every attempt is recorded in
 * `webhook_deliveries` so the settings page can show why an endpoint is failing.
 */
async function deliver(
  target: DeliveryTarget,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  const body = JSON.stringify({ event, createdAt: new Date().toISOString(), data: payload });
  const db = getDb();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const timestamp = Math.floor(Date.now() / 1000);

    try {
      await assertPublicWebhookUrl(target.url);
      const response = await fetch(target.url, {
        method: "POST",
        // A redirect could bounce the request to an internal address after the check.
        redirect: "manual",
        headers: {
          "content-type": "application/json",
          "user-agent": "Short-Webhooks/1",
          "x-short-event": event,
          "x-short-signature": await sign(openWebhookSecret(target.secret), timestamp, body),
        },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      await db.insert(webhookDeliveries).values({
        webhookId: target.id,
        event,
        payload,
        responseStatus: response.status,
        error: response.ok
          ? null
          : (await response.text().catch(() => "non-2xx response")).slice(0, MAX_ERROR_LENGTH),
        attempt,
        deliveredAt: response.ok ? new Date() : null,
      });

      if (response.ok) {
        return;
      }
      // 3xx (not followed) and 4xx mean the endpoint rejected the payload; retrying
      // will not help.
      if (response.status < 500 && response.status !== 429) {
        return;
      }
    } catch (error) {
      await db.insert(webhookDeliveries).values({
        webhookId: target.id,
        event,
        payload,
        responseStatus: null,
        error: error instanceof Error ? error.message.slice(0, MAX_ERROR_LENGTH) : "Request failed",
        attempt,
      });
      if (error instanceof WebhookUrlError) {
        return;
      }
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
    }
  }
}

/**
 * Fan-out for a workspace event. Never throws and never blocks the caller's response:
 * the returned promise is handed to `after()` by the callers that have a request scope.
 */
export async function dispatchWebhook(
  workspaceId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const rows = await getDb()
      .select({ id: webhooks.id, url: webhooks.url, secret: webhooks.secret, events: webhooks.events })
      .from(webhooks)
      .where(and(eq(webhooks.workspaceId, workspaceId), eq(webhooks.enabled, true)));

    const targets = rows.filter((row) => row.events.includes(event));
    await Promise.all(targets.map((target) => deliver(target, event, payload)));
  } catch (error) {
    console.error("dispatchWebhook failed", event, error);
  }
}

/**
 * Click and biopage-view events originate at the edge, so the ingest worker relays each
 * batch to `/api/internal/events`. Almost no workspace subscribes to them, and a batch
 * arrives every few seconds, so the subscriber set is cached rather than queried per
 * batch. Returns null when the cache is cold.
 */
const RELAY_EVENTS = ["link.clicked", "biopage.viewed"] as const;

export async function getRelaySubscribers(): Promise<string[]> {
  const cached = await cacheGet<string[]>("webhook-relay-subscribers");
  if (cached) {
    return cached;
  }

  const rows = await getDb()
    .select({ workspaceId: webhooks.workspaceId, events: webhooks.events })
    .from(webhooks)
    .where(eq(webhooks.enabled, true));

  const subscribers = [
    ...new Set(
      rows
        .filter((row) => RELAY_EVENTS.some((event) => row.events.includes(event)))
        .map((row) => row.workspaceId),
    ),
  ];

  await cacheSet("webhook-relay-subscribers", subscribers, 60);
  return subscribers;
}

/** Drops the subscriber cache so a newly saved endpoint starts receiving click events. */
export async function invalidateRelaySubscribers(): Promise<void> {
  await cacheDelete("webhook-relay-subscribers");
}

export async function listWebhookDeliveries(webhookId: string, limit = 20) {
  return getDb()
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.webhookId, webhookId))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(limit);
}

export async function testWebhook(row: WebhookRow): Promise<void> {
  await deliver({ id: row.id, url: row.url, secret: row.secret }, "link.created", {
    ping: true,
    webhookId: row.id,
  });
}

export async function replayWebhookDelivery(webhookId: string): Promise<void> {
  const db = getDb();
  const [hook] = await db.select().from(webhooks).where(eq(webhooks.id, webhookId)).limit(1);
  const [last] = await db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.webhookId, webhookId))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(1);
  if (!hook || !last) {
    throw new Error("Nothing to replay");
  }
  await deliver({ id: hook.id, url: hook.url, secret: hook.secret }, last.event, last.payload);
}

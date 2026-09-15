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

export type WebhookWithStats = WebhookRow & {
  lastDeliveryAt: Date | null;
  lastStatus: number | null;
  lastError: string | null;
};

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 8000;

export function generateWebhookSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `whsec_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
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
      const response = await fetch(target.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "Short-Webhooks/1",
          "x-short-event": event,
          "x-short-signature": await sign(target.secret, timestamp, body),
        },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      await db.insert(webhookDeliveries).values({
        webhookId: target.id,
        event,
        payload,
        responseStatus: response.status,
        error: response.ok ? null : await response.text().catch(() => "non-2xx response"),
        attempt,
        deliveredAt: response.ok ? new Date() : null,
      });

      if (response.ok) {
        return;
      }
      // 4xx means the endpoint rejected the payload; retrying will not help.
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return;
      }
    } catch (error) {
      await db.insert(webhookDeliveries).values({
        webhookId: target.id,
        event,
        payload,
        responseStatus: null,
        error: error instanceof Error ? error.message : "Request failed",
        attempt,
      });
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

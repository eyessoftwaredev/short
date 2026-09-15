import type { TrackedEvent } from "@short/core";
import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { serverEnv } from "@/lib/env";
import { dispatchWebhook, getRelaySubscribers } from "@/lib/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook relay for edge-originated events. The ingest worker posts each batch here
 * after it lands in ClickHouse, because `link.clicked` and `biopage.viewed` cannot be
 * dispatched from the panel.
 *
 * ClickHouse is the source of truth for analytics, so this endpoint is purely
 * best-effort: it answers immediately and fans out in `after()`. Batches for workspaces
 * with no subscription are dropped without touching the database.
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (token === "" || token !== serverEnv().INTERNAL_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let events: TrackedEvent[];
  try {
    const body = (await request.json()) as { events?: unknown };
    events = Array.isArray(body.events) ? (body.events as TrackedEvent[]) : [];
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (events.length === 0) {
    return NextResponse.json({ relayed: 0 });
  }

  const subscribers = new Set(await getRelaySubscribers());
  if (subscribers.size === 0) {
    return NextResponse.json({ relayed: 0 });
  }

  // Bot traffic is excluded from the panel's default views, so it is not worth a delivery.
  const relayable = events.filter(
    (event) => !event.isBot && subscribers.has(event.workspaceId) && event.type !== "bio_click",
  );

  after(async () => {
    for (const event of relayable) {
      const isBio = event.type === "bio_view";
      await dispatchWebhook(
        event.workspaceId,
        isBio ? "biopage.viewed" : "link.clicked",
        isBio
          ? {
              biopageId: event.biopageId,
              ts: event.ts,
              country: event.country,
              city: event.city,
              device: event.device,
              referrer: event.referrerDomain,
            }
          : {
              linkId: event.linkId,
              hostname: event.hostname,
              slug: event.slug,
              qrId: event.qrId === "" ? null : event.qrId,
              ts: event.ts,
              destination: event.destination,
              country: event.country,
              city: event.city,
              device: event.device,
              os: event.os,
              browser: event.browser,
              referrer: event.referrerDomain,
            },
      );
    }
  });

  return NextResponse.json({ relayed: relayable.length });
}

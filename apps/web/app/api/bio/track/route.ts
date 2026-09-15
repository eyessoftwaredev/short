import { insertEvents } from "@short/analytics";
import {
  deriveVisitorId,
  emptyEvent,
  hostnameOf,
  parseAcceptLanguage,
  parseUserAgent,
  utcDayStamp,
  type EventType,
} from "@short/core";
import { biopages, domains, eq, getDb } from "@short/db";
import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env";
import { cacheGet, cacheSet, rateLimit } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bio pages live on customer hostnames, so beacons are always cross-origin. */
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
} as const;

/** Views come from the redirect worker; only clicks are reported by the browser. */
const ALLOWED_TYPES: EventType[] = ["bio_click"];

type Payload = {
  type?: unknown;
  biopageId?: unknown;
  blockId?: unknown;
  destination?: unknown;
};

type PageMeta = { workspaceId: string; handle: string; hostname: string };

/**
 * Cached because a popular bio page would otherwise issue one Postgres lookup per
 * visitor just to attribute the event.
 */
async function loadPageMeta(biopageId: string): Promise<PageMeta | null> {
  const cacheKey = `bio-meta:${biopageId}`;
  const cached = await cacheGet<PageMeta>(cacheKey);
  if (cached) {
    return cached;
  }

  const [row] = await getDb()
    .select({
      workspaceId: biopages.workspaceId,
      handle: biopages.handle,
      hostname: domains.hostname,
      published: biopages.published,
    })
    .from(biopages)
    .leftJoin(domains, eq(biopages.domainId, domains.id))
    .where(eq(biopages.id, biopageId))
    .limit(1);

  if (!row || !row.published) {
    return null;
  }

  const meta: PageMeta = {
    workspaceId: row.workspaceId,
    handle: row.handle,
    hostname: row.hostname ?? serverEnv().PLATFORM_SHORT_DOMAIN,
  };
  await cacheSet(cacheKey, meta, 300);
  return meta;
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "";

  const limit = await rateLimit(`bio-track:${ip}`, 120, 60);
  if (!limit.allowed) {
    return new NextResponse(null, { status: 429, headers: CORS_HEADERS });
  }

  let payload: Payload;
  try {
    payload = JSON.parse(await request.text()) as Payload;
  } catch {
    return new NextResponse(null, { status: 400, headers: CORS_HEADERS });
  }

  const type = payload.type as EventType;
  const biopageId = typeof payload.biopageId === "string" ? payload.biopageId : "";

  if (!ALLOWED_TYPES.includes(type) || biopageId === "") {
    return new NextResponse(null, { status: 400, headers: CORS_HEADERS });
  }

  const meta = await loadPageMeta(biopageId);
  if (!meta) {
    return new NextResponse(null, { status: 404, headers: CORS_HEADERS });
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  const ua = parseUserAgent(userAgent);
  const referrer = request.headers.get("referer") ?? "";

  try {
    await insertEvents([
      {
        ...emptyEvent(),
        eventId: crypto.randomUUID(),
        ts: new Date().toISOString(),
        type,
        workspaceId: meta.workspaceId,
        hostname: meta.hostname,
        slug: meta.handle,
        destination: typeof payload.destination === "string" ? payload.destination.slice(0, 2048) : "",
        country: (request.headers.get("cf-ipcountry") ?? "").toUpperCase(),
        city: request.headers.get("cf-ipcity") ?? "",
        device: ua.device,
        os: ua.os,
        osVersion: ua.osVersion,
        browser: ua.browser,
        browserVersion: ua.browserVersion,
        userAgent: userAgent.slice(0, 512),
        referrer: referrer.slice(0, 1024),
        referrerDomain: hostnameOf(referrer),
        language: parseAcceptLanguage(request.headers.get("accept-language")),
        isBot: ua.isBot,
        visitorId: await deriveVisitorId({
          ip,
          userAgent,
          linkId: biopageId,
          dailySalt: `${serverEnv().INTERNAL_TOKEN}:${utcDayStamp()}`,
        }),
        biopageId,
        blockId: typeof payload.blockId === "string" ? payload.blockId : "",
      },
    ]);
  } catch (error) {
    console.error("failed to record bio event", error);
  }

  // Beacons ignore the body; always 204 so a failed insert never retries in a loop.
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

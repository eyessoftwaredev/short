import {
  deriveVisitorId,
  hostnameOf,
  utcDayStamp,
  type EventType,
  type LinkKvRecord,
  type ParsedUa,
  type Resolution,
  type TrackedEvent,
} from "@short/core";
import type { EdgeEnv } from "./env";

export type TrackContext = {
  request: Request;
  cf: IncomingRequestCfProperties | undefined;
  ua: ParsedUa;
  language: string;
  hostname: string;
  slug: string;
  url: URL;
};

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function buildEvent(
  env: EdgeEnv,
  ctx: TrackContext,
  options: {
    type: EventType;
    link: Pick<LinkKvRecord, "id" | "workspaceId"> | null;
    resolution: Resolution;
    biopageId?: string;
    blockId?: string;
    qrId?: string;
    workspaceId?: string;
  },
): Promise<TrackedEvent> {
  const referrer = ctx.request.headers.get("referer") ?? "";
  const clientIp = ctx.request.headers.get("cf-connecting-ip") ?? "";
  const userAgent = ctx.request.headers.get("user-agent") ?? "";
  const params = ctx.url.searchParams;

  const visitorId = await deriveVisitorId({
    ip: clientIp,
    userAgent,
    linkId: options.link?.id ?? options.biopageId ?? "",
    dailySalt: `${env.VISITOR_SALT}:${utcDayStamp()}`,
  });

  return {
    eventId: crypto.randomUUID(),
    ts: new Date().toISOString(),
    type: options.type,

    workspaceId: options.link?.workspaceId ?? options.workspaceId ?? "",
    linkId: options.link?.id ?? "",
    hostname: ctx.hostname,
    slug: ctx.slug,

    destination: options.resolution.destination,
    resolutionSource: options.resolution.source,
    ruleId: options.resolution.ruleId ?? "",
    variantId: options.resolution.variantId ?? "",

    country: str(ctx.cf?.country).toUpperCase(),
    region: str(ctx.cf?.region),
    city: str(ctx.cf?.city),
    continent: str(ctx.cf?.continent).toUpperCase(),
    latitude: num(ctx.cf?.latitude),
    longitude: num(ctx.cf?.longitude),
    timezone: str(ctx.cf?.timezone),
    asn: num(ctx.cf?.asn),
    asOrg: str(ctx.cf?.asOrganization),
    colo: str(ctx.cf?.colo),

    device: ctx.ua.device,
    os: ctx.ua.os,
    osVersion: ctx.ua.osVersion,
    browser: ctx.ua.browser,
    browserVersion: ctx.ua.browserVersion,
    userAgent: userAgent.slice(0, 512),

    referrer: referrer.slice(0, 1024),
    referrerDomain: hostnameOf(referrer),

    utmSource: params.get("utm_source") ?? "",
    utmMedium: params.get("utm_medium") ?? "",
    utmCampaign: params.get("utm_campaign") ?? "",
    utmTerm: params.get("utm_term") ?? "",
    utmContent: params.get("utm_content") ?? "",

    language: ctx.language,
    isBot: ctx.ua.isBot,

    visitorId,
    ip: clientIp,

    biopageId: options.biopageId ?? "",
    blockId: options.blockId ?? "",
    qrId: options.qrId ?? "",
  };
}

/** Queue failures are swallowed: losing one analytics event must never break a redirect. */
export async function enqueue(env: EdgeEnv, event: TrackedEvent): Promise<void> {
  try {
    await env.CLICK_QUEUE.send(event);
  } catch (error) {
    console.error("queue send failed", error);
  }
}

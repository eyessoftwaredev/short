import type { TrackedEvent } from "./events";

/**
 * Column-for-column mirror of the ClickHouse `events` table.
 *
 * This lives in core rather than in `@short/analytics` because the queue consumer runs
 * on workerd and talks to ClickHouse over plain HTTP, so it cannot pull in the Node client.
 */
export type EventRow = {
  event_id: string;
  ts: string;
  type: string;
  workspace_id: string;
  link_id: string;
  hostname: string;
  slug: string;
  destination: string;
  resolution_source: string;
  rule_id: string;
  variant_id: string;
  country: string;
  region: string;
  city: string;
  continent: string;
  latitude: number;
  longitude: number;
  timezone: string;
  asn: number;
  as_org: string;
  colo: string;
  device: string;
  os: string;
  os_version: string;
  browser: string;
  browser_version: string;
  user_agent: string;
  referrer: string;
  referrer_domain: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  language: string;
  is_bot: number;
  visitor_id: string;
  biopage_id: string;
  block_id: string;
  qr_id: string;
};

/** ClickHouse DateTime64 expects `YYYY-MM-DD HH:MM:SS.mmm`, not ISO-8601 with `T`/`Z`. */
export function toClickhouseDateTime(iso: string): string {
  return iso.replace("T", " ").replace("Z", "").slice(0, 23);
}

export function toEventRow(event: TrackedEvent): EventRow {
  return {
    event_id: event.eventId,
    ts: toClickhouseDateTime(event.ts),
    type: event.type,
    workspace_id: event.workspaceId,
    link_id: event.linkId,
    hostname: event.hostname,
    slug: event.slug,
    destination: event.destination,
    resolution_source: event.resolutionSource,
    rule_id: event.ruleId,
    variant_id: event.variantId,
    country: event.country,
    region: event.region,
    city: event.city,
    continent: event.continent,
    latitude: event.latitude,
    longitude: event.longitude,
    timezone: event.timezone,
    asn: event.asn,
    as_org: event.asOrg,
    colo: event.colo,
    device: event.device,
    os: event.os,
    os_version: event.osVersion,
    browser: event.browser,
    browser_version: event.browserVersion,
    user_agent: event.userAgent,
    referrer: event.referrer,
    referrer_domain: event.referrerDomain,
    utm_source: event.utmSource,
    utm_medium: event.utmMedium,
    utm_campaign: event.utmCampaign,
    utm_term: event.utmTerm,
    utm_content: event.utmContent,
    language: event.language,
    is_bot: event.isBot ? 1 : 0,
    visitor_id: event.visitorId,
    biopage_id: event.biopageId,
    block_id: event.blockId,
    qr_id: event.qrId,
  };
}

/** Serialises a batch into the newline-delimited body ClickHouse's JSONEachRow expects. */
export function toJsonEachRow(events: TrackedEvent[]): string {
  return events.map((event) => JSON.stringify(toEventRow(event))).join("\n");
}

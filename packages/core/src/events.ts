import type { ResolutionSource } from "./targeting";
import type { BrowserName, DeviceType, OsName } from "./ua";

export const EVENT_TYPES = ["click", "qr_scan", "bio_view", "bio_click"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/**
 * The single event shape that travels edge worker -> Cloudflare Queue -> ClickHouse.
 * No raw IP is ever present: the worker replaces it with a rotating `visitorId` hash.
 */
export type TrackedEvent = {
  eventId: string;
  /** ISO-8601 with milliseconds, UTC. */
  ts: string;
  type: EventType;

  workspaceId: string;
  linkId: string;
  hostname: string;
  slug: string;

  destination: string;
  resolutionSource: ResolutionSource;
  ruleId: string;
  variantId: string;

  country: string;
  region: string;
  city: string;
  continent: string;
  latitude: number;
  longitude: number;
  timezone: string;
  asn: number;
  asOrg: string;
  colo: string;

  device: DeviceType;
  os: OsName;
  osVersion: string;
  browser: BrowserName;
  browserVersion: string;
  userAgent: string;

  referrer: string;
  referrerDomain: string;

  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;

  language: string;
  isBot: boolean;

  /** Rotating pseudonymous id, see `deriveVisitorId`. */
  visitorId: string;

  /** Set for bio_view / bio_click events. */
  biopageId: string;
  blockId: string;

  /** Set for qr_scan events, from the `?qr=` marker baked into the printed code. */
  qrId: string;
};

export function emptyEvent(): TrackedEvent {
  return {
    eventId: "",
    ts: new Date().toISOString(),
    type: "click",
    workspaceId: "",
    linkId: "",
    hostname: "",
    slug: "",
    destination: "",
    resolutionSource: "default",
    ruleId: "",
    variantId: "",
    country: "",
    region: "",
    city: "",
    continent: "",
    latitude: 0,
    longitude: 0,
    timezone: "",
    asn: 0,
    asOrg: "",
    colo: "",
    device: "desktop",
    os: "other",
    osVersion: "",
    browser: "other",
    browserVersion: "",
    userAgent: "",
    referrer: "",
    referrerDomain: "",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmTerm: "",
    utmContent: "",
    language: "",
    isBot: false,
    visitorId: "",
    biopageId: "",
    blockId: "",
    qrId: "",
  };
}

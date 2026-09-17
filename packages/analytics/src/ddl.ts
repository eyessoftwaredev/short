/**
 * ClickHouse schema, expressed as an ordered list of idempotent statements.
 * `migrate.ts` replays the whole list; every statement must be `IF NOT EXISTS`.
 */

export const EVENTS_TABLE = "events";

const eventsTable = `
CREATE TABLE IF NOT EXISTS events
(
  event_id           String,
  ts                 DateTime64(3, 'UTC'),
  type               LowCardinality(String),

  workspace_id       String,
  link_id            String,
  hostname           LowCardinality(String),
  slug               String,

  destination        String,
  resolution_source  LowCardinality(String),
  rule_id            String,
  variant_id         String,

  country            LowCardinality(String),
  region             LowCardinality(String),
  city               String,
  continent          LowCardinality(String),
  latitude           Float32,
  longitude          Float32,
  timezone           LowCardinality(String),
  asn                UInt32,
  as_org             String,
  colo               LowCardinality(String),

  device             LowCardinality(String),
  os                 LowCardinality(String),
  os_version         String,
  browser            LowCardinality(String),
  browser_version    String,
  user_agent         String,

  referrer           String,
  referrer_domain    LowCardinality(String),

  utm_source         LowCardinality(String),
  utm_medium         LowCardinality(String),
  utm_campaign       String,
  utm_term           String,
  utm_content        String,

  language           LowCardinality(String),
  is_bot             UInt8,

  visitor_id         String,
  ip                 String,

  biopage_id         String,
  block_id           String,
  qr_id              String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (workspace_id, link_id, ts)
TTL toDateTime(ts) + INTERVAL 25 MONTH
SETTINGS index_granularity = 8192
`;

const linkDaily = `
CREATE TABLE IF NOT EXISTS link_daily
(
  workspace_id String,
  link_id      String,
  day          Date,
  clicks       SimpleAggregateFunction(sum, UInt64),
  visitors     AggregateFunction(uniq, String)
)
ENGINE = AggregatingMergeTree
PARTITION BY toYYYYMM(day)
ORDER BY (workspace_id, link_id, day)
`;

const mvLinkDaily = `
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_link_daily TO link_daily AS
SELECT
  workspace_id,
  link_id,
  toDate(ts)          AS day,
  toUInt64(count())   AS clicks,
  uniqState(visitor_id) AS visitors
FROM events
WHERE is_bot = 0
GROUP BY workspace_id, link_id, day
`;

const geoDaily = `
CREATE TABLE IF NOT EXISTS geo_daily
(
  workspace_id String,
  link_id      String,
  day          Date,
  country      LowCardinality(String),
  region       LowCardinality(String),
  city         String,
  clicks       SimpleAggregateFunction(sum, UInt64),
  visitors     AggregateFunction(uniq, String)
)
ENGINE = AggregatingMergeTree
PARTITION BY toYYYYMM(day)
ORDER BY (workspace_id, link_id, day, country, region, city)
`;

const mvGeoDaily = `
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_geo_daily TO geo_daily AS
SELECT
  workspace_id,
  link_id,
  toDate(ts)            AS day,
  country,
  region,
  city,
  toUInt64(count())     AS clicks,
  uniqState(visitor_id) AS visitors
FROM events
WHERE is_bot = 0
GROUP BY workspace_id, link_id, day, country, region, city
`;

const deviceDaily = `
CREATE TABLE IF NOT EXISTS device_daily
(
  workspace_id String,
  link_id      String,
  day          Date,
  device       LowCardinality(String),
  os           LowCardinality(String),
  browser      LowCardinality(String),
  clicks       SimpleAggregateFunction(sum, UInt64),
  visitors     AggregateFunction(uniq, String)
)
ENGINE = AggregatingMergeTree
PARTITION BY toYYYYMM(day)
ORDER BY (workspace_id, link_id, day, device, os, browser)
`;

const mvDeviceDaily = `
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_device_daily TO device_daily AS
SELECT
  workspace_id,
  link_id,
  toDate(ts)            AS day,
  device,
  os,
  browser,
  toUInt64(count())     AS clicks,
  uniqState(visitor_id) AS visitors
FROM events
WHERE is_bot = 0
GROUP BY workspace_id, link_id, day, device, os, browser
`;

const referrerDaily = `
CREATE TABLE IF NOT EXISTS referrer_daily
(
  workspace_id    String,
  link_id         String,
  day             Date,
  referrer_domain LowCardinality(String),
  utm_source      LowCardinality(String),
  utm_medium      LowCardinality(String),
  clicks          SimpleAggregateFunction(sum, UInt64),
  visitors        AggregateFunction(uniq, String)
)
ENGINE = AggregatingMergeTree
PARTITION BY toYYYYMM(day)
ORDER BY (workspace_id, link_id, day, referrer_domain, utm_source, utm_medium)
`;

const mvReferrerDaily = `
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_referrer_daily TO referrer_daily AS
SELECT
  workspace_id,
  link_id,
  toDate(ts)            AS day,
  referrer_domain,
  utm_source,
  utm_medium,
  toUInt64(count())     AS clicks,
  uniqState(visitor_id) AS visitors
FROM events
WHERE is_bot = 0
GROUP BY workspace_id, link_id, day, referrer_domain, utm_source, utm_medium
`;

const addIpColumn = `
ALTER TABLE events
ADD COLUMN IF NOT EXISTS ip String DEFAULT ''
`;

export const DDL_STATEMENTS: readonly string[] = [
  eventsTable,
  addIpColumn,
  linkDaily,
  mvLinkDaily,
  geoDaily,
  mvGeoDaily,
  deviceDaily,
  mvDeviceDaily,
  referrerDaily,
  mvReferrerDaily,
].map((statement) => statement.trim());

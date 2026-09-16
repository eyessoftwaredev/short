# Deployment

Two planes, deployed independently:

| Plane | Contents | Deployed with |
| --- | --- | --- |
| Origin | `apps/web`, Postgres, Redis, ClickHouse | Coolify (`infra/compose.yaml`) |
| Edge | `apps/edge` (redirects), `apps/ingest` (queue consumer) | Wrangler |

The edge never talks to Postgres. It reads Workers KV, falls back to
`POST /api/internal/resolve` on the origin, and pushes click events into a Cloudflare
Queue. That is the only coupling between the two planes.

## 1. Origin (Coolify)

Create a **Docker Compose** resource pointing at this repository with
`infra/compose.yaml` as the compose file, then set these variables:

| Variable | Notes |
| --- | --- |
| `APP_URL` | Public panel URL, e.g. `https://app.short.app`. Also used as `BETTER_AUTH_URL`. |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 48` |
| `SECRET_ENCRYPTION_KEY` | `openssl rand -base64 48`. Decrypts Stripe and Cloudflare secrets stored in Postgres. |
| `PLATFORM_SHORT_DOMAIN` | Default short domain, e.g. `sho.rt` |
| `CUSTOM_HOSTNAME_TARGET` | What customers CNAME to, e.g. `cname.short.app` |
| `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `CLICKHOUSE_PASSWORD` | Generated once, never rotated in place without a maintenance window |
| `INTERNAL_TOKEN` | Shared with `apps/edge` |
| `CRON_SECRET` | Bearer token for `/api/cron/*` |

Optional integrations (`CF_*`, `GOOGLE_*`, `RESEND_API_KEY`, `STRIPE_*`) can be left
empty — `/admin/system` renders each unset integration as *disabled* rather than
failing. Stripe keys can also be pasted in `/admin/system` and are stored encrypted;
env `STRIPE_*` remains a fallback for local boot. Without `CF_*` the panel keeps
working but link changes are not pushed to KV, so the edge will serve stale data.

Expose only `web` through Coolify's proxy. ClickHouse's HTTP port has to be reachable
from Cloudflare for the ingest worker; put it behind a separate subdomain with TLS and
restrict it to [Cloudflare's IP ranges](https://www.cloudflare.com/ips/).

### Schema migrations

Run before the first deploy and on every deploy that changes a schema:

```bash
pnpm db:migrate   # Drizzle -> Postgres
pnpm ch:migrate   # DDL + materialized views -> ClickHouse
pnpm db:seed      # plans table, first run only
```

In Coolify, set this as the resource's pre-deployment command using
`infra/Dockerfile.migrate`. Both migrators are idempotent: Drizzle tracks applied
migrations in `__drizzle_migrations`, and every ClickHouse statement is
`IF NOT EXISTS`.

### Cron

`POST /api/cron/usage` rolls ClickHouse click counts into `usage_counters` so quota
checks do not have to query ClickHouse on every request. Schedule it hourly:

```bash
curl -fsS -X POST https://app.short.app/api/cron/usage \
  -H "authorization: Bearer $CRON_SECRET"
```

## 2. Edge (Wrangler)

### One-time Cloudflare setup

```bash
# KV namespace for link + domain + biopage records
pnpm --filter @short/edge exec wrangler kv namespace create LINKS
pnpm --filter @short/edge exec wrangler kv namespace create LINKS --preview

# Click event queue and its dead letter queue
pnpm --filter @short/ingest exec wrangler queues create short-clicks
pnpm --filter @short/ingest exec wrangler queues create short-clicks-dlq

# Archive for batches that exhausted their retries
pnpm --filter @short/ingest exec wrangler r2 bucket create short-failed-events
```

Put the returned namespace id into `apps/edge/wrangler.jsonc` (`REPLACE_WITH_KV_ID`,
`REPLACE_WITH_PREVIEW_KV_ID`) and the zone name into `routes[0].zone_name`. The same
namespace id goes into the origin's `CF_KV_NAMESPACE_ID`.

### Secrets

```bash
cd apps/edge
wrangler secret put INTERNAL_TOKEN   # must equal the origin's INTERNAL_TOKEN
wrangler secret put VISITOR_SALT     # long-lived; rotating resets unique visitors

cd ../ingest
wrangler secret put CLICKHOUSE_PASSWORD
wrangler secret put INTERNAL_TOKEN   # only needed for the click-webhook relay
```

`vars` in each `wrangler.jsonc` holds the non-secret config (`ORIGIN_URL`,
`DEFAULT_NOT_FOUND`, `KV_TTL_SECONDS`, `CLICKHOUSE_URL`, `CLICKHOUSE_DATABASE`,
`CLICKHOUSE_USER`). Update those to the real hostnames before the first deploy.

### Deploy

```bash
pnpm --filter @short/edge run deploy
pnpm --filter @short/ingest run deploy
```

Deploy `ingest` first on a fresh environment. A consumer-less queue buffers messages
for four days, so the ordering only matters for how soon events show up.

## 3. Cloudflare for SaaS

1. Enable **Cloudflare for SaaS** on the zone.
2. Set the fallback origin to a hostname routed to `short-edge`, e.g.
   `fallback.short.app`.
3. Publish `CUSTOM_HOSTNAME_TARGET` (`cname.short.app`) as a CNAME to that fallback.
4. The `CF_API_TOKEN` needs `Zone → SSL and Certificates → Edit` plus
   `Account → Workers KV Storage → Edit`.

Customers then add `CNAME <their host> -> cname.short.app` in `/domains`, and the panel
polls `GET /custom_hostnames/{id}` for the DNS and SSL state.

## 4. Stripe

Point a webhook endpoint at `https://app.short.app/api/webhooks/stripe` subscribed to
`checkout.session.completed`, `customer.subscription.created`,
`customer.subscription.updated`, `customer.subscription.deleted` and
`invoice.payment_failed`. Paste the restricted key and signing secret in
`/admin/system` (stored encrypted). `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
remain an env fallback until the admin form is saved.

Plan rows carry the Stripe price ids (`stripePriceMonthlyId` / `stripePriceYearlyId`);
set them in `/admin/plans` after creating the prices. A plan without a price id renders
as "contact us" instead of offering checkout.

## 5. Local development

```bash
pnpm install
docker compose -f infra/compose.dev.yaml up -d   # postgres + redis + clickhouse only
cp .env.example .env
pnpm db:migrate && pnpm ch:migrate && pnpm db:seed
pnpm dev
```

`pnpm dev` runs the panel on `http://localhost:3000`, which covers everything except
the redirect path — biopages render at `/{handle}`, but short links are resolved by the
worker. To exercise redirects and targeting locally:

```bash
pnpm --filter @short/edge dev     # http://localhost:8787
pnpm --filter @short/ingest dev
```

`wrangler dev` needs the KV namespace ids filled in; it will use a local KV simulation,
so create a link in the panel first and let the worker backfill from
`/api/internal/resolve`.

# Short

Multi-tenant link shortener: branded short links with geo/device targeting, dynamic QR
codes, biopages, and click analytics.

## Layout

```
apps/web/            Next.js 16 panel, public API, biopage renderer
apps/edge/           Cloudflare Worker: redirect + targeting engine
apps/ingest/         Queue consumer -> ClickHouse
packages/core/       Targeting engine, slug, UA parse, KV payloads, Zod schemas
packages/db/         Drizzle schema + migrations (Postgres)
packages/analytics/  ClickHouse client, DDL, query functions
infra/               Compose files, Dockerfiles, ClickHouse config, deploy runbook
```

`packages/core` is imported by both the worker and the panel, so a targeting rule
evaluates identically at the edge and in the panel's rule preview. It has no Node
built-in dependencies.

## Request paths

A visitor hitting a short link never touches Postgres:

```
visitor -> Cloudflare for SaaS -> apps/edge -> Workers KV
                                      |            ^
                                      |            | KV write on every panel mutation
                                      |            |
                                      +-> KV miss -> apps/web /api/internal/resolve
                                      |
                                      +-> Queue -> apps/ingest -> ClickHouse
```

The panel reads Postgres for configuration and ClickHouse for statistics. Workers KV is
a cache with a TTL, never the source of truth.

## Getting started

```bash
pnpm install
docker compose -f infra/compose.dev.yaml up -d
cp .env.example .env            # then fill in the secrets
pnpm db:migrate                 # Drizzle -> Postgres
pnpm ch:migrate                 # DDL + materialized views -> ClickHouse
pnpm db:seed                    # plan catalogue
pnpm dev                        # http://localhost:3000
```

The first account to register gets a personal workspace on the free plan. To reach
`/admin`, set `role = 'superadmin'` on your user row.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Panel only |
| `pnpm dev:edge` | Redirect worker + queue consumer via `wrangler dev` |
| `pnpm build` | Production build of the panel |
| `pnpm typecheck` | `tsc --noEmit` across every package |
| `pnpm test` | Unit tests for `core`, `edge` and `ingest` |
| `pnpm db:generate` | New Drizzle migration from the schema |
| `pnpm deploy:workers` | `wrangler deploy` for both workers |

## Panels

- **Member** — `/dashboard`, `/links`, `/analytics`, `/qr`, `/bio`, `/domains`,
  `/settings`, `/billing`
- **Admin** — `/admin` plus users (ban + impersonation), workspaces, global link search
  with abuse flagging, custom-hostname health, plan CRUD, system status, audit log
- **Public** — `/{handle}` biopages, `/login`, `/register`, `/forgot`, and the password
  gate served by the worker
- **Reference** — `/docs` is the untouched `eyesAppTheme` component catalogue, kept as a
  live reference for the design system

UI is built entirely from `components/ui`, `components/shell` and `components/kit`; no
component library is installed. Tables use TanStack Table (headless) rendered through the
theme's `Table` primitives, and forms use React Hook Form + Zod through `Field`/`Input`.

## Public API

`/api/v1` is a Hono app authenticated with workspace API keys
(`authorization: Bearer short_...`), rate limited per plan, and documented at
`/api/v1/openapi.json`. Keys are created in `/settings`.

Webhooks are signed with HMAC-SHA256 over `{timestamp}.{body}` and sent as
`x-short-signature: t=...,v1=...`. `link.created`, `link.updated`, `link.deleted` and
`domain.verified` are dispatched by the panel; `link.clicked` and `biopage.viewed` are
relayed by the ingest worker after the events land in ClickHouse.

## Privacy

Raw IP addresses are never stored. The worker derives
`visitor_id = hash(ip + user-agent + link id + daily salt)` and only that value enters
the pipeline. Bot traffic is flagged as `is_bot` and excluded from the panel's default
views. The `events` table drops partitions after 25 months.

## Deployment

See [`infra/README.md`](infra/README.md).

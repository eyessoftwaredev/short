import { WEBHOOK_EVENTS } from "@short/core";

/**
 * Hand-written OpenAPI 3.1 document. It is served verbatim at `/api/v1/openapi.json`
 * and must be updated alongside the route handlers in `route.ts`.
 */
export function openApiDocument(serverUrl: string): Record<string, unknown> {
  const errorResponse = {
    description: "Error",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/Error" },
      },
    },
  };

  const pageParameters = [
    { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
    {
      name: "pageSize",
      in: "query",
      schema: { type: "integer", minimum: 1, maximum: 100, default: 100 },
    },
  ];

  // Ranges are clamped to the plan's history retention.
  const rangeParameters = [
    {
      name: "range",
      in: "query",
      schema: { type: "string", enum: ["24h", "7d", "30d", "90d", "12m", "all", "custom"] },
    },
    { name: "from", in: "query", description: "`custom` only, YYYY-MM-DD", schema: { type: "string", format: "date" } },
    { name: "to", in: "query", description: "`custom` only, YYYY-MM-DD", schema: { type: "string", format: "date" } },
  ];

  const linkResponse = {
    description: "A single link",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: { data: { $ref: "#/components/schemas/Link" } },
        },
      },
    },
  };

  return {
    openapi: "3.1.0",
    info: {
      title: "Short API",
      version: "1.0.0",
      description:
        "Account-scoped REST API. Authenticate with `x-api-key: short_...` or `authorization: Bearer short_...`. Rate limits follow the account plan and are reported in the `x-ratelimit-*` response headers.",
    },
    servers: [{ url: serverUrl }],
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    tags: [
      { name: "Links" },
      { name: "Analytics" },
      { name: "Domains" },
      { name: "QR codes" },
      { name: "Bio pages" },
      { name: "Account" },
    ],
    paths: {
      "/me": {
        get: {
          tags: ["Account"],
          summary: "Current account, plan and usage",
          responses: { "200": { description: "Account context" }, default: errorResponse },
        },
      },
      "/links": {
        get: {
          tags: ["Links"],
          summary: "List links",
          parameters: [
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "domainId", in: "query", schema: { type: "string", format: "uuid" } },
            { name: "tag", in: "query", schema: { type: "string" } },
            {
              name: "status",
              in: "query",
              schema: { type: "string", enum: ["all", "active", "archived", "expired", "scheduled"] },
            },
            {
              name: "health",
              in: "query",
              description: "Destination health from the link monitor.",
              schema: { $ref: "#/components/schemas/HealthStatus" },
            },
            {
              name: "clickLimit",
              in: "query",
              description: "`set`: links with a click limit. `reached`: links that used it up.",
              schema: { type: "string", enum: ["set", "reached"] },
            },
            { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
            { name: "pageSize", in: "query", schema: { type: "integer", minimum: 10, maximum: 100 } },
          ],
          responses: {
            "200": {
              description: "Paginated links",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/Link" } },
                      pagination: { $ref: "#/components/schemas/Pagination" },
                    },
                  },
                },
              },
            },
            default: errorResponse,
          },
        },
        post: {
          tags: ["Links"],
          summary: "Create a link",
          description:
            "Fields left out of the body (openMode, noIndex, forwardQuery, folderId, utm) take the account's link defaults from Settings. Explicit values, including null and false, always win.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LinkInput" },
              },
            },
          },
          responses: { "201": linkResponse, default: errorResponse },
        },
      },
      "/links/{id}": {
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        get: {
          tags: ["Links"],
          summary: "Retrieve a link",
          responses: { "200": linkResponse, default: errorResponse },
        },
        patch: {
          tags: ["Links"],
          summary: "Update a link",
          requestBody: {
            required: true,
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/LinkInput" } },
            },
          },
          responses: { "200": linkResponse, default: errorResponse },
        },
        delete: {
          tags: ["Links"],
          summary: "Delete a link",
          responses: { "204": { description: "Deleted" }, default: errorResponse },
        },
      },
      "/links/{id}/stats": {
        get: {
          tags: ["Analytics"],
          summary: "Click summary and breakdowns for a link",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
            ...rangeParameters,
          ],
          responses: { "200": { description: "Stats" }, default: errorResponse },
        },
      },
      "/analytics": {
        get: {
          tags: ["Analytics"],
          summary: "Account-wide click summary and time series",
          parameters: [
            ...rangeParameters,
          ],
          responses: { "200": { description: "Stats" }, default: errorResponse },
        },
      },
      "/domains": {
        get: {
          tags: ["Domains"],
          summary: "List domains available to this account",
          responses: { "200": { description: "Domains" }, default: errorResponse },
        },
        post: {
          tags: ["Domains"],
          summary: "Add a custom domain",
          responses: { "201": { description: "Created" }, default: errorResponse },
        },
      },
      "/qr-codes": {
        get: {
          tags: ["QR codes"],
          summary: "List QR codes",
          parameters: pageParameters,
          responses: { "200": { description: "QR codes" }, default: errorResponse },
        },
        post: {
          tags: ["QR codes"],
          summary: "Create a QR code",
          responses: { "201": { description: "Created" }, default: errorResponse },
        },
      },
      "/qr-codes/{id}": {
        patch: {
          tags: ["QR codes"],
          summary: "Update a QR code",
          responses: { "200": { description: "Updated" }, default: errorResponse },
        },
      },
      "/biopages": {
        get: {
          tags: ["Bio pages"],
          summary: "List bio pages",
          parameters: pageParameters,
          responses: { "200": { description: "Bio pages" }, default: errorResponse },
        },
        post: {
          tags: ["Bio pages"],
          summary: "Create a bio page",
          responses: { "201": { description: "Created" }, default: errorResponse },
        },
      },
      "/biopages/{id}": {
        patch: {
          tags: ["Bio pages"],
          summary: "Update a bio page",
          responses: { "200": { description: "Updated" }, default: errorResponse },
        },
      },
    },
    // Outgoing webhooks (configured in Settings), signed with x-short-signature.
    webhooks: {
      "link.broken": {
        post: {
          summary: "A link's destination failed two consecutive health checks",
          description:
            "`data` is the Link resource; `data.health` carries the status code and `brokenSince`. Sent once per transition to broken, not on every failed check.",
          requestBody: {
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/WebhookEnvelope" } },
            },
          },
          responses: { "200": { description: "Acknowledge with any 2xx" } },
        },
      },
      "link.created": {
        post: {
          summary: "A link was created in the panel or through the API",
          requestBody: {
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/WebhookEnvelope" } },
            },
          },
          responses: { "200": { description: "Acknowledge with any 2xx" } },
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: "apiKey", in: "header", name: "x-api-key" },
        BearerAuth: { type: "http", scheme: "bearer" },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                fields: { type: "object", additionalProperties: { type: "array", items: { type: "string" } } },
              },
            },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            page: { type: "integer" },
            pageSize: { type: "integer" },
            total: { type: "integer" },
          },
        },
        OpenMode: {
          type: "string",
          enum: ["auto", "app", "browser"],
          default: "auto",
          description:
            "How phones are handed to the destination. auto: plain redirect. app: open well-known destinations (YouTube, Instagram, TikTok, X, Facebook, Spotify, LinkedIn, WhatsApp, Telegram, Pinterest) in their native app on iOS/Android, falling back to the web. browser: when opened inside a social app's in-app browser, offer to reopen the link in the phone's browser. Omit on PATCH to keep the current value.",
        },
        HealthStatus: {
          type: "string",
          enum: ["unknown", "ok", "broken"],
          description:
            "Destination health. The monitor re-checks links every few hours; `broken` means two consecutive checks got a 404/410/5xx, a DNS failure or a timeout.",
        },
        LinkHealth: {
          type: "object",
          properties: {
            status: { $ref: "#/components/schemas/HealthStatus" },
            statusCode: { type: "integer", nullable: true },
            checkedAt: { type: "string", format: "date-time", nullable: true },
            brokenSince: { type: "string", format: "date-time", nullable: true },
          },
        },
        Link: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            slug: { type: "string" },
            hostname: { type: "string" },
            shortUrl: { type: "string", format: "uri" },
            destination: { type: "string", format: "uri" },
            title: { type: "string", nullable: true },
            description: { type: "string", nullable: true },
            tags: { type: "array", items: { type: "string" } },
            startsAt: { type: "string", format: "date-time", nullable: true },
            expiresAt: { type: "string", format: "date-time", nullable: true },
            passwordProtected: { type: "boolean" },
            openMode: { $ref: "#/components/schemas/OpenMode" },
            maxClicks: { type: "integer", nullable: true },
            clickLimitReachedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
              description: "Set once the click limit was reached; the link then behaves as expired.",
            },
            health: { $ref: "#/components/schemas/LinkHealth" },
            archived: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        WebhookEnvelope: {
          type: "object",
          required: ["event", "createdAt", "data"],
          properties: {
            event: { type: "string", enum: [...WEBHOOK_EVENTS] },
            createdAt: { type: "string", format: "date-time" },
            data: { type: "object" },
          },
        },
        LinkInput: {
          type: "object",
          required: ["domainId", "destination"],
          properties: {
            domainId: { type: "string", format: "uuid" },
            slug: { type: "string", description: "Generated when omitted." },
            destination: { type: "string", format: "uri" },
            title: { type: "string" },
            description: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            startsAt: {
              type: "string",
              format: "date-time",
              nullable: true,
              description:
                "Scheduled go-live. Until then the short link behaves as if it did not exist. Must be before expiresAt.",
            },
            expiresAt: { type: "string", format: "date-time", nullable: true },
            expiredDestination: { type: "string", format: "uri", nullable: true },
            password: { type: "string", nullable: true },
            iosDestination: { type: "string", format: "uri", nullable: true },
            androidDestination: { type: "string", format: "uri", nullable: true },
            cloaked: { type: "boolean" },
            noIndex: { type: "boolean" },
            forwardQuery: { type: "boolean" },
            openMode: { $ref: "#/components/schemas/OpenMode" },
            maxClicks: {
              type: "integer",
              minimum: 1,
              maximum: 1000000000,
              nullable: true,
              description:
                "Lifetime click limit (human clicks and QR scans; bots excluded). Once reached the link behaves as expired: expiredDestination if set, otherwise not found. Enforced every few minutes, so a busy link can overshoot slightly. null removes the limit; omit on PATCH to keep it.",
            },
            archived: { type: "boolean" },
            utm: { type: "object", nullable: true },
            rules: {
              type: "array",
              description: "Targeting rules, evaluated by priority at the edge.",
              items: { type: "object" },
            },
            abVariants: { type: "array", items: { type: "object" } },
          },
        },
      },
    },
  };
}

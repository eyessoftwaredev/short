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
        "Account-scoped REST API. Authenticate with `x-api-key`. Rate limits follow the account plan and are reported in the `x-ratelimit-*` response headers.",
    },
    servers: [{ url: serverUrl }],
    security: [{ ApiKeyAuth: [] }],
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
              schema: { type: "string", enum: ["all", "active", "archived", "expired"] },
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
            {
              name: "range",
              in: "query",
              schema: { type: "string", enum: ["24h", "7d", "30d", "90d", "12m"] },
            },
          ],
          responses: { "200": { description: "Stats" }, default: errorResponse },
        },
      },
      "/analytics": {
        get: {
          tags: ["Analytics"],
          summary: "Account-wide click summary and time series",
          parameters: [
            {
              name: "range",
              in: "query",
              schema: { type: "string", enum: ["24h", "7d", "30d", "90d", "12m"] },
            },
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
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: "apiKey", in: "header", name: "x-api-key" },
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
            expiresAt: { type: "string", format: "date-time", nullable: true },
            passwordProtected: { type: "boolean" },
            archived: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
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
            expiresAt: { type: "string", format: "date-time", nullable: true },
            expiredDestination: { type: "string", format: "uri", nullable: true },
            password: { type: "string", nullable: true },
            iosDestination: { type: "string", format: "uri", nullable: true },
            androidDestination: { type: "string", format: "uri", nullable: true },
            cloaked: { type: "boolean" },
            noIndex: { type: "boolean" },
            forwardQuery: { type: "boolean" },
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

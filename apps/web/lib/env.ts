import { z } from "zod";

/**
 * Parsed lazily so a missing optional secret never breaks `next build`; the first
 * request that actually needs the value is the one that fails, with a clear message.
 */
const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url(),
  /** Envelope key for secrets at rest. Rotating it independently of auth does not brick sessions. */
  SECRET_ENCRYPTION_KEY: z.string().min(32, "SECRET_ENCRYPTION_KEY must be at least 32 characters"),

  APP_URL: z.string().url(),
  /** Public marketing origin. When omitted, `app.` is stripped from APP_URL. */
  SITE_URL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().url().optional(),
  ),
  /** Default short domain used when a workspace has not added one of its own. */
  PLATFORM_SHORT_DOMAIN: z.string().min(1),
  /** Hostname customers point their CNAME at (Cloudflare for SaaS). */
  CUSTOM_HOSTNAME_TARGET: z.string().min(1).default("cname.short.ky"),

  REDIS_URL: z.string().min(1).optional(),
  /** Isolates keys when more than one brand shares a Redis instance (`short:` / `kisa:`). */
  REDIS_KEY_PREFIX: z.string().min(1).default("short:"),

  CLICKHOUSE_URL: z.string().min(1).default("http://localhost:8123"),
  CLICKHOUSE_USER: z.string().default("default"),
  CLICKHOUSE_PASSWORD: z.string().default(""),
  CLICKHOUSE_DATABASE: z.string().default("short"),

  /** Shared secret the edge worker presents to /api/internal/resolve. */
  INTERNAL_TOKEN: z.string().min(16),
  /** Must match the edge worker secret so bio view + click share the same visitor_id. */
  VISITOR_SALT: z.string().min(16).optional(),

  CF_ACCOUNT_ID: z.string().optional(),
  CF_ZONE_ID: z.string().optional(),
  CF_API_TOKEN: z.string().optional(),
  CF_KV_NAMESPACE_ID: z.string().optional(),
  /** Third-party OAuth client so customers approve DNS writes in a Cloudflare popup. */
  CF_OAUTH_CLIENT_ID: z.string().optional(),
  CF_OAUTH_CLIENT_SECRET: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  /** Cloudflare Email Service token (Email Sending: Send); uses CF_ACCOUNT_ID. */
  CF_EMAIL_TOKEN: z.string().optional(),
  /** "Name <address>"; the address must be on one of the platform's own domains. */
  EMAIL_FROM: z.string().default("Short <noreply@short.ky>"),
  /** Optional Reply-To for outgoing mail, e.g. support@short.ky. */
  EMAIL_REPLY_TO: z.string().email().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  /** Bearer token for /api/cron/* maintenance endpoints. Defaults to the internal token. */
  CRON_SECRET: z.string().min(16).optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) {
    return cached;
  }

  // Deploy dashboards (Coolify) keep blank variables as "". Treat them as unset so an
  // empty optional value falls back to its default instead of failing `.min()` checks.
  const provided = Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => value !== undefined && value.trim() !== ""),
  );
  const parsed = serverSchema.safeParse(provided);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid server environment:\n${issues}`);
  }

  cached = parsed.data;
  return cached;
}

/** Daily visitor_id salt — must match apps/edge `VISITOR_SALT`. */
export function visitorSalt(): string {
  const env = serverEnv();
  return env.VISITOR_SALT ?? env.INTERNAL_TOKEN;
}

/** Marketing origin. Localhost (no `app.` prefix) stays the same host as the panel. */
export function siteUrl(): string {
  const env = serverEnv();
  if (env.SITE_URL) {
    return new URL(env.SITE_URL).origin;
  }
  const url = new URL(env.APP_URL);
  url.hostname = url.hostname.replace(/^app\./i, "");
  return url.origin;
}

/** Feature flags derived from which integrations are configured. */
export function features(): {
  google: boolean;
  email: boolean;
  cloudflare: boolean;
  cloudflareOAuth: boolean;
  redis: boolean;
} {
  const env = serverEnv();
  return {
    google: false,
    email: Boolean(env.CF_ACCOUNT_ID && env.CF_EMAIL_TOKEN),
    cloudflare: Boolean(env.CF_ACCOUNT_ID && env.CF_API_TOKEN && env.CF_KV_NAMESPACE_ID),
    cloudflareOAuth: Boolean(env.CF_OAUTH_CLIENT_ID && env.CF_OAUTH_CLIENT_SECRET),
    redis: Boolean(env.REDIS_URL),
  };
}

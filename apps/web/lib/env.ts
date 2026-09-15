import { z } from "zod";

/**
 * Parsed lazily so a missing optional secret never breaks `next build`; the first
 * request that actually needs the value is the one that fails, with a clear message.
 */
const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url(),

  APP_URL: z.string().url(),
  /** Default short domain used when a workspace has not added one of its own. */
  PLATFORM_SHORT_DOMAIN: z.string().min(1),
  /** Hostname customers point their CNAME at (Cloudflare for SaaS). */
  CUSTOM_HOSTNAME_TARGET: z.string().min(1).default("cname.short.app"),

  REDIS_URL: z.string().min(1).optional(),

  CLICKHOUSE_URL: z.string().min(1).default("http://localhost:8123"),
  CLICKHOUSE_USER: z.string().default("default"),
  CLICKHOUSE_PASSWORD: z.string().default(""),
  CLICKHOUSE_DATABASE: z.string().default("short"),

  /** Shared secret the edge worker presents to /api/internal/resolve. */
  INTERNAL_TOKEN: z.string().min(16),

  CF_ACCOUNT_ID: z.string().optional(),
  CF_ZONE_ID: z.string().optional(),
  CF_API_TOKEN: z.string().optional(),
  CF_KV_NAMESPACE_ID: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Short <noreply@short.app>"),

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

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid server environment:\n${issues}`);
  }

  cached = parsed.data;
  return cached;
}

/** Feature flags derived from which integrations are configured. */
export function features(): {
  google: boolean;
  email: boolean;
  stripe: boolean;
  cloudflare: boolean;
  redis: boolean;
} {
  const env = serverEnv();
  return {
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    email: Boolean(env.RESEND_API_KEY),
    stripe: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET),
    cloudflare: Boolean(env.CF_ACCOUNT_ID && env.CF_API_TOKEN && env.CF_KV_NAMESPACE_ID),
    redis: Boolean(env.REDIS_URL),
  };
}

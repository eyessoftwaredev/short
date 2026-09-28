import { hasBearerSecret } from "./api-auth";
import { serverEnv } from "./env";

/**
 * `/api/cron/*` bearer check, same rule as `/api/cron/usage`: `CRON_SECRET`, falling
 * back to `INTERNAL_TOKEN` when it is unset (see `CRON_SECRET` in lib/env.ts).
 */
export function isAuthorizedCron(headers: Headers): boolean {
  const env = serverEnv();
  return hasBearerSecret(headers, env.CRON_SECRET ?? env.INTERNAL_TOKEN);
}

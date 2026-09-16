import { eq } from "drizzle-orm";
import type { Database } from "./client";
import { domains, organization, type DomainRow } from "./schema";

/** Owner of the shared short domain. Not a customer workspace, so it has no members. */
export const PLATFORM_WORKSPACE_ID = "platform";

/**
 * `PLATFORM_SHORT_DOMAIN` may be `https://short.ky/` or `localhost:3200`. Keep the
 * port (local) and drop scheme/path. `normalizeHostInput` cannot be used here: it
 * strips the port via `URL.hostname`.
 */
export function normalizePlatformHostname(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "") {
    return "";
  }
  return trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/\/.*$/, "");
}

/**
 * Inserts or repairs the shared short-domain row. A hostname that was claimed as a
 * custom domain is moved onto the platform workspace and marked `is_platform`.
 */
export async function ensurePlatformDomain(
  db: Database,
  rawHostname: string | undefined,
): Promise<DomainRow | null> {
  const hostname = normalizePlatformHostname(rawHostname ?? "");
  if (hostname === "") {
    return null;
  }

  const [existing] = await db.select().from(domains).where(eq(domains.hostname, hostname)).limit(1);
  if (
    existing?.isPlatform &&
    existing.workspaceId === PLATFORM_WORKSPACE_ID &&
    existing.status === "active"
  ) {
    return existing;
  }

  await db
    .insert(organization)
    .values({ id: PLATFORM_WORKSPACE_ID, name: "Platform", slug: PLATFORM_WORKSPACE_ID })
    .onConflictDoNothing();

  const [row] = await db
    .insert(domains)
    .values({
      workspaceId: PLATFORM_WORKSPACE_ID,
      hostname,
      isPlatform: true,
      isDefault: true,
      status: "active",
      sslStatus: "active",
      verifiedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: domains.hostname,
      set: {
        workspaceId: PLATFORM_WORKSPACE_ID,
        isPlatform: true,
        isDefault: true,
        status: "active",
        sslStatus: "active",
        verifiedAt: new Date(),
        updatedAt: new Date(),
      },
    })
    .returning();

  return row ?? null;
}

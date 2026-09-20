import { after } from "next/server";
import { headers } from "next/headers";
import { isSafeDestination, linkInputSchema, normalizeDestination } from "@short/core";
import { PLATFORM_WORKSPACE_ID, ensurePlatformDomain, getDb } from "@short/db";
import { QuotaError } from "./action-result";
import { scanDestination } from "./abuse";
import { incrementLinksCreated } from "./billing";
import { serverEnv } from "./env";
import { createLink, shortUrl } from "./links";
import { assertQuota } from "./quota";
import { rateLimit } from "./redis";
import { getLandingAuthState, getSessionContext } from "./session";
import { getPersonalWorkspaceId } from "./workspace";

export type LandingShortenError = "invalid" | "rate_limited" | "quota" | "failed";

export type LandingShortenResult =
  | { ok: true; shortUrl: string; owned: boolean }
  | { ok: false; error: LandingShortenError };

function clientIp(headerList: Headers): string {
  return (
    headerList.get("cf-connecting-ip") ??
    headerList.get("x-real-ip") ??
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function createLandingShortLink(raw: string): Promise<LandingShortenResult> {
  const destination = normalizeDestination(raw);
  if (destination === "" || !isSafeDestination(destination)) {
    return { ok: false, error: "invalid" };
  }

  const headerList = await headers();
  const signedIn = await getLandingAuthState();
  const session = signedIn ? await getSessionContext() : null;
  const ip = clientIp(headerList);
  const hourly = await rateLimit(`landing-shorten:${ip}`, signedIn ? 40 : 10, 3600);
  if (!hourly.allowed) {
    return { ok: false, error: "rate_limited" };
  }
  if (!signedIn) {
    const burst = await rateLimit(`landing-shorten-burst:${ip}`, 5, 60);
    if (!burst.allowed) {
      return { ok: false, error: "rate_limited" };
    }
  }

  try {
    const db = getDb();
    const platformDomain = await ensurePlatformDomain(db, serverEnv().PLATFORM_SHORT_DOMAIN);
    if (!platformDomain) {
      return { ok: false, error: "failed" };
    }

    let workspaceId = PLATFORM_WORKSPACE_ID;
    let creatorId: string | null = null;
    let owned = false;

    if (signedIn && session) {
      const personalId = await getPersonalWorkspaceId(session.user.id);
      if (personalId) {
        try {
          await assertQuota(personalId, session.plan, "links");
          workspaceId = personalId;
          creatorId = session.user.id;
          owned = true;
        } catch (error) {
          if (error instanceof QuotaError) {
            return { ok: false, error: "quota" };
          }
          throw error;
        }
      }
    }

    const input = linkInputSchema.parse({
      domainId: platformDomain.id,
      destination,
    });
    const link = await createLink({ workspaceId, creatorId, input });
    after(() => {
      void scanDestination(workspaceId, link.id, destination);
    });
    if (owned) {
      await incrementLinksCreated(workspaceId);
    }

    return { ok: true, shortUrl: shortUrl(link.hostname, link.slug), owned };
  } catch (error) {
    console.error("landing shorten failed", error);
    return { ok: false, error: "failed" };
  }
}

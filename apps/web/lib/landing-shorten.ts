import { after } from "next/server";
import { headers } from "next/headers";
import { isSafeDestination, linkInputSchema, normalizeDestination } from "@short/core";
import { PLATFORM_WORKSPACE_ID, ensurePlatformDomain, getDb } from "@short/db";
import { QuotaError } from "./action-result";
import { clientIp, lookupThreat, scanDestination } from "./abuse";
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

export async function createLandingShortLink(raw: string): Promise<LandingShortenResult> {
  const destination = normalizeDestination(raw);
  if (destination === "" || !isSafeDestination(destination)) {
    return { ok: false, error: "invalid" };
  }

  const headerList = await headers();
  const signedIn = await getLandingAuthState();
  const session = signedIn ? await getSessionContext() : null;
  const ip = clientIp(headerList) ?? "unknown";
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
          // The link lands in the caller's personal workspace, so their own plan applies
          // (`session.plan` follows whichever team workspace happens to be active).
          await assertQuota(personalId, session.accountPlan, "links");
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

    // Anonymous links sit on the platform domain with no accountable owner, which makes
    // them the phishing vector of choice: known-bad destinations are refused up front.
    if (!owned && (await lookupThreat(destination))) {
      return { ok: false, error: "invalid" };
    }

    const parsed = linkInputSchema.safeParse({
      domainId: platformDomain.id,
      destination,
    });
    if (!parsed.success) {
      return { ok: false, error: "invalid" };
    }
    const link = await createLink({ workspaceId, creatorId, input: parsed.data });
    if (owned) {
      after(() => {
        void scanDestination(workspaceId, link.id, destination);
      });
      await incrementLinksCreated(workspaceId);
    }

    return { ok: true, shortUrl: shortUrl(link.hostname, link.slug), owned };
  } catch (error) {
    console.error("landing shorten failed", error);
    return { ok: false, error: "failed" };
  }
}

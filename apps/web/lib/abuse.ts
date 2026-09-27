import { and, eq, getDb, links } from "@short/db";

/**
 * Visitor IP for rate limits and abuse records. Cloudflare's `cf-connecting-ip` wins,
 * then `x-real-ip` (set by the edge worker / reverse proxy). A client can prepend any
 * value to `x-forwarded-for`, so only its last hop (added by the nearest proxy) is used,
 * and only when neither header is present, e.g. in local development.
 */
export function clientIp(headers: Headers): string | null {
  const direct = headers.get("cf-connecting-ip")?.trim() || headers.get("x-real-ip")?.trim();
  if (direct) {
    return direct;
  }
  const hops = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((hop) => hop.trim())
    .filter((hop) => hop !== "");
  return hops.at(-1) ?? null;
}

type SafeBrowsingMatch = {
  threatType?: string;
};

/**
 * Google Safe Browsing verdict for a destination, or null when it is clean, the key is
 * not configured, or the lookup failed (the check is best-effort by design).
 */
export async function lookupThreat(destination: string): Promise<string | null> {
  const key = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (!key) {
    return null;
  }

  try {
    const response = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client: { clientId: "short-ky", clientVersion: "1.0" },
          threatInfo: {
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url: destination }],
          },
        }),
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) {
      console.error("safe browsing failed", response.status);
      return null;
    }

    const body = (await response.json()) as { matches?: SafeBrowsingMatch[] };
    return body.matches?.[0]?.threatType ?? null;
  } catch (error) {
    console.error("safe browsing error", error);
    return null;
  }
}

/**
 * Checks a destination against Google Safe Browsing when a key is configured.
 * Threats are flagged on the link; the destination stays live unless an admin disables it.
 */
export async function scanDestination(
  workspaceId: string,
  linkId: string,
  destination: string,
): Promise<void> {
  const threat = await lookupThreat(destination);
  if (!threat) {
    return;
  }

  try {
    await getDb()
      .update(links)
      .set({
        abuseFlaggedAt: new Date(),
        abuseReason: `Safe Browsing: ${threat}`,
      })
      .where(and(eq(links.id, linkId), eq(links.workspaceId, workspaceId)));
  } catch (error) {
    console.error("safe browsing flag failed", workspaceId, error);
  }
}

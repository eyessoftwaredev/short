import { eq, getDb, links } from "@short/db";

type SafeBrowsingMatch = {
  threatType?: string;
};

/**
 * Checks a destination against Google Safe Browsing when a key is configured.
 * Threats are flagged on the link; the destination stays live unless an admin disables it.
 */
export async function scanDestination(
  workspaceId: string,
  linkId: string,
  destination: string,
): Promise<void> {
  const key = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (!key) {
    return;
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
      return;
    }

    const body = (await response.json()) as { matches?: SafeBrowsingMatch[] };
    const threat = body.matches?.[0]?.threatType;
    if (!threat) {
      return;
    }

    await getDb()
      .update(links)
      .set({
        abuseFlaggedAt: new Date(),
        abuseReason: `Safe Browsing: ${threat}`,
      })
      .where(eq(links.id, linkId));
  } catch (error) {
    console.error("safe browsing error", workspaceId, error);
  }
}

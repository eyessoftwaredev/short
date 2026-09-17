import { and, eq, getDb, workspacePixels, type PixelProvider, type WorkspacePixelRow } from "@short/db";
import { decryptSecret, encryptSecret } from "./secret";

export async function listPixels(workspaceId: string): Promise<WorkspacePixelRow[]> {
  return getDb().select().from(workspacePixels).where(eq(workspacePixels.workspaceId, workspaceId));
}

export async function upsertPixel(input: {
  workspaceId: string;
  provider: PixelProvider;
  pixelId: string;
  accessToken?: string;
  enabled: boolean;
}): Promise<void> {
  const existing = await getDb()
    .select()
    .from(workspacePixels)
    .where(
      and(eq(workspacePixels.workspaceId, input.workspaceId), eq(workspacePixels.provider, input.provider)),
    )
    .limit(1);

  const accessTokenEnc =
    input.accessToken && input.accessToken.trim() !== ""
      ? encryptSecret(input.accessToken.trim())
      : existing[0]?.accessTokenEnc ?? null;

  if (existing[0]) {
    await getDb()
      .update(workspacePixels)
      .set({
        pixelId: input.pixelId,
        accessTokenEnc,
        enabled: input.enabled,
        updatedAt: new Date(),
      })
      .where(eq(workspacePixels.id, existing[0].id));
    return;
  }

  await getDb().insert(workspacePixels).values({
    workspaceId: input.workspaceId,
    provider: input.provider,
    pixelId: input.pixelId,
    accessTokenEnc,
    enabled: input.enabled,
  });
}

export async function firePixels(
  workspaceId: string,
  event: { type: string; destination: string; eventId: string },
): Promise<void> {
  const rows = await getDb()
    .select()
    .from(workspacePixels)
    .where(and(eq(workspacePixels.workspaceId, workspaceId), eq(workspacePixels.enabled, true)));

  await Promise.all(
    rows.map(async (row) => {
      try {
        if (row.provider === "meta" && row.accessTokenEnc) {
          const token = decryptSecret(row.accessTokenEnc);
          await fetch(
            `https://graph.facebook.com/v21.0/${encodeURIComponent(row.pixelId)}/events?access_token=${encodeURIComponent(token)}`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                data: [
                  {
                    event_name: event.type === "bio_click" ? "Lead" : "PageView",
                    event_time: Math.floor(Date.now() / 1000),
                    event_id: event.eventId,
                    event_source_url: event.destination,
                    action_source: "website",
                  },
                ],
              }),
              signal: AbortSignal.timeout(4000),
            },
          );
        }
      } catch (error) {
        console.error("pixel fire failed", row.provider, error);
      }
    }),
  );
}

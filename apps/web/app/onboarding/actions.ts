"use server";

import { eq, getDb, member } from "@short/db";
import { headers } from "next/headers";
import { z } from "zod";
import { fail, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { auth } from "@/lib/auth";
import { firstWinPath, readDraftDestination } from "@/lib/draft-link";
import { requireSession } from "@/lib/session";
import { createWorkspace } from "@/lib/workspace";

const schema = z.object({ name: z.string().trim().min(2).max(64) });

/** Where the "what do you want to do first?" choice leads once the workspace exists. */
const INTENT_PATHS = {
  link: "/links/new",
  qr: "/qr/new",
  bio: "/bio/new",
  dashboard: "/dashboard",
} as const;

export type OnboardingIntent = keyof typeof INTENT_PATHS;

function isIntent(value: unknown): value is OnboardingIntent {
  return typeof value === "string" && Object.hasOwn(INTENT_PATHS, value);
}

/** Recovery path: a signed-in user with no membership creates their first workspace. */
export async function createFirstWorkspace(
  name: string,
  intent?: OnboardingIntent,
): Promise<ActionResult<{ href: string }>> {
  try {
    const context = await requireSession();
    const parsed = schema.safeParse({ name });
    if (!parsed.success) {
      return fail("workspace_name_length");
    }

    const db = getDb();
    const existing = await db
      .select({ id: member.id })
      .from(member)
      .where(eq(member.userId, context.user.id))
      .limit(1);

    // Already recovered in another tab — treat as success so the client just navigates.
    if (existing.length === 0) {
      const workspace = await createWorkspace(context.user.id, parsed.data.name);
      await auth.api.setActiveOrganization({
        headers: await headers(),
        body: { organizationId: workspace.id },
      });
    }

    // A link drafted on the landing page always wins: the editor opens prefilled with it.
    if ((await readDraftDestination()) || !isIntent(intent)) {
      return ok({ href: await firstWinPath() });
    }
    return ok({ href: INTENT_PATHS[intent] });
  } catch (error) {
    return toActionError(error);
  }
}

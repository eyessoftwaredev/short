"use server";

import { eq, getDb, member } from "@short/db";
import { headers } from "next/headers";
import { z } from "zod";
import { fail, ok, toActionError, type ActionResult } from "@/lib/action-result";
import { auth } from "@/lib/auth";
import { firstWinPath } from "@/lib/draft-link";
import { requireSession } from "@/lib/session";
import { createWorkspace } from "@/lib/workspace";

const schema = z.object({ name: z.string().trim().min(2).max(64) });

/** Recovery path: a signed-in user with no membership creates their first workspace. */
export async function createFirstWorkspace(name: string): Promise<ActionResult<{ href: string }>> {
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

    return ok({ href: await firstWinPath() });
  } catch (error) {
    return toActionError(error);
  }
}

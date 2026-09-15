import { slugify } from "@short/core";
import { eq, getDb, member, organization, subscriptions } from "@short/db";

export async function uniqueWorkspaceSlug(base: string): Promise<string> {
  const db = getDb();
  const root = slugify(base) || "workspace";

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const existing = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.slug, candidate))
      .limit(1);
    if (existing.length === 0) {
      return candidate;
    }
  }

  return `${root}-${crypto.randomUUID().slice(0, 8)}`;
}

export type CreatedWorkspace = { id: string; name: string; slug: string };

/**
 * Creates a workspace with the caller as owner and a free subscription row. Used by the
 * signup hook and by /onboarding when a user somehow ends up with no membership.
 */
export async function createWorkspace(
  userId: string,
  name: string,
  fallback = "Workspace",
): Promise<CreatedWorkspace> {
  const db = getDb();
  const workspaceName = name.trim() === "" ? fallback : name.trim();
  const id = crypto.randomUUID();
  const slug = await uniqueWorkspaceSlug(workspaceName);

  await db.insert(organization).values({ id, name: workspaceName, slug });
  await db.insert(member).values({
    id: crypto.randomUUID(),
    organizationId: id,
    userId,
    role: "owner",
  });
  await db.insert(subscriptions).values({ workspaceId: id, planKey: "free", status: "active" });

  return { id, name: workspaceName, slug };
}

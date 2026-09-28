import "server-only";
import { cookies } from "next/headers";
import {
  and,
  apikey,
  biopages,
  domains,
  eq,
  getDb,
  invitation,
  links,
  member,
  ne,
  qrCodes,
} from "@short/db";
import { hasWorkspaceRole, type WorkspaceContext } from "@/lib/session";
import { gettingStartedCookieName } from "./getting-started-cookie";

export type GettingStartedStepId = "link" | "qr" | "bio" | "domain" | "team" | "api";

export type GettingStartedStep = {
  id: GettingStartedStepId;
  href: string;
  done: boolean;
};

/** True when at least one row matches. `LIMIT 1` keeps each probe an index lookup. */
async function exists(query: PromiseLike<unknown[]>): Promise<boolean> {
  const rows = await query;
  return rows.length > 0;
}

/**
 * Onboarding steps for the active workspace, or `null` when the card should not
 * render: the user dismissed it or every step is already done.
 *
 * Steps the user cannot act on are left out rather than shown locked — a member
 * cannot add domains, and a plan without custom domains would only get an upsell.
 */
export async function loadGettingStarted(
  context: WorkspaceContext,
): Promise<GettingStartedStep[] | null> {
  const workspaceId = context.workspace.id;
  const store = await cookies();
  if (store.get(gettingStartedCookieName(workspaceId))?.value === context.user.id) {
    return null;
  }

  const db = getDb();
  const canManage = context.isSuperadmin || hasWorkspaceRole(context.role, "admin");
  const showDomain = canManage && context.plan.limits.customDomains !== 0;
  const showTeam = canManage && context.workspace.kind === "team";
  const showApi = canManage && !showTeam && context.plan.features.apiAccess;

  const [hasLink, hasQr, hasBio, hasDomain, hasTeammate, hasApiKey] = await Promise.all([
    exists(db.select({ id: links.id }).from(links).where(eq(links.workspaceId, workspaceId)).limit(1)),
    exists(
      db.select({ id: qrCodes.id }).from(qrCodes).where(eq(qrCodes.workspaceId, workspaceId)).limit(1),
    ),
    exists(
      db
        .select({ id: biopages.id })
        .from(biopages)
        .where(eq(biopages.workspaceId, workspaceId))
        .limit(1),
    ),
    showDomain
      ? exists(
          db
            .select({ id: domains.id })
            .from(domains)
            .where(and(eq(domains.workspaceId, workspaceId), eq(domains.isPlatform, false)))
            .limit(1),
        )
      : Promise.resolve(false),
    showTeam
      ? Promise.all([
          exists(
            db
              .select({ id: member.id })
              .from(member)
              .where(and(eq(member.organizationId, workspaceId), ne(member.role, "owner")))
              .limit(1),
          ),
          exists(
            db
              .select({ id: invitation.id })
              .from(invitation)
              .where(
                and(eq(invitation.organizationId, workspaceId), eq(invitation.status, "pending")),
              )
              .limit(1),
          ),
        ]).then(([joined, invited]) => joined || invited)
      : Promise.resolve(false),
    showApi
      ? exists(
          db.select({ id: apikey.id }).from(apikey).where(eq(apikey.referenceId, workspaceId)).limit(1),
        )
      : Promise.resolve(false),
  ]);

  const steps: GettingStartedStep[] = [
    { id: "link", href: "/links/new", done: hasLink },
    { id: "qr", href: "/qr/new", done: hasQr },
    { id: "bio", href: "/bio/new", done: hasBio },
  ];
  if (showDomain) {
    steps.push({ id: "domain", href: "/domains/new", done: hasDomain });
  }
  if (showTeam) {
    steps.push({ id: "team", href: "/settings?tab=team", done: hasTeammate });
  }
  if (showApi) {
    steps.push({ id: "api", href: "/settings?tab=api", done: hasApiKey });
  }

  return steps.every((step) => step.done) ? null : steps;
}

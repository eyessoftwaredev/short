import type { Metadata } from "next";
import { PanelShell } from "@/components/shell/panel-shell";
import { Hero } from "@/components/ui";
import { serverEnv } from "@/lib/env";
import { hasWorkspaceRole, requireWorkspace } from "@/lib/session";
import { listApiKeys, listInvites, listMembers } from "@/lib/team";
import { listWebhooks } from "@/lib/webhooks";
import { parseSettingsTab } from "./settings-types";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = { title: "Settings" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const context = await requireWorkspace();
  const raw = await searchParams;

  const [members, invites, apiKeys, hooks] = await Promise.all([
    listMembers(context.workspace.id),
    listInvites(context.workspace.id),
    listApiKeys(context.workspace.id),
    listWebhooks(context.workspace.id),
  ]);

  return (
    <PanelShell title="Settings" crumbs={[{ label: context.workspace.name }]}>
      <Hero
        eyebrow={context.plan.name}
        title="Settings"
        description="Your profile, the workspace, who can access it, and the credentials that let your own systems talk to Short."
      />

      <SettingsView
        user={{ id: context.user.id, name: context.user.name, email: context.user.email }}
        workspace={{
          id: context.workspace.id,
          name: context.workspace.name,
          slug: context.workspace.slug,
        }}
        members={members.map((row) => ({
          id: row.id,
          userId: row.userId,
          name: row.name,
          email: row.email,
          role: row.role,
          joinedAt: row.joinedAt.toISOString(),
        }))}
        invites={invites.map((row) => ({
          id: row.id,
          email: row.email,
          role: row.role,
          expiresAt: row.expiresAt.toISOString(),
        }))}
        apiKeys={apiKeys.map((row) => ({
          id: row.id,
          name: row.name,
          start: row.start,
          enabled: row.enabled,
          requestCount: row.requestCount,
          lastRequest: row.lastRequest?.toISOString() ?? null,
          createdAt: row.createdAt.toISOString(),
        }))}
        webhookRows={hooks.map((row) => ({
          id: row.id,
          url: row.url,
          events: row.events,
          enabled: row.enabled,
          lastStatus: row.lastStatus,
          lastDeliveryAt: row.lastDeliveryAt?.toISOString() ?? null,
          lastError: row.lastError,
        }))}
        canManage={hasWorkspaceRole(context.role, "admin") || context.isSuperadmin}
        isOwner={hasWorkspaceRole(context.role, "owner") || context.isSuperadmin}
        planName={context.plan.name}
        features={{
          apiAccess: context.plan.features.apiAccess,
          webhooks: context.plan.features.webhooks,
        }}
        memberLimit={context.plan.limits.members}
        apiRateLimit={context.plan.limits.apiRequestsPerHour}
        apiBaseUrl={`${serverEnv().APP_URL.replace(/\/$/, "")}/api/v1`}
        initialTab={parseSettingsTab(raw.tab)}
      />
    </PanelShell>
  );
}

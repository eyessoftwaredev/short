import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Hero } from "@/components/ui";
import { serverEnv } from "@/lib/env";
import { getWorkspaceUsage } from "@/lib/quota";
import { hasWorkspaceRole, requireWorkspace } from "@/lib/session";
import { listApiKeys, listInvites, listMembers } from "@/lib/team";
import { listWebhooks } from "@/lib/webhooks";
import { parseSettingsTab } from "./settings-types";
import { SettingsView } from "./settings-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const context = await requireWorkspace();
  const raw = await searchParams;
  const t = await getTranslations("settings");

  const [members, invites, apiKeys, hooks, usage] = await Promise.all([
    listMembers(context.workspace.id),
    listInvites(context.workspace.id),
    listApiKeys(context.workspace.id),
    listWebhooks(context.workspace.id),
    getWorkspaceUsage(context.workspace.id),
  ]);

  const requestedTab = parseSettingsTab(raw.tab);
  const initialTab =
    requestedTab === "members" && context.workspace.kind === "personal" ? "profile" : requestedTab;

  return (
    <PanelShell title={t("title")} crumbs={[{ label: context.workspace.name }]}>
      <Hero eyebrow={context.plan.name} title={t("title")} description={t("description")} />

      <SettingsView
        user={{ id: context.user.id, name: context.user.name, email: context.user.email }}
        workspace={{
          id: context.workspace.id,
          name: context.workspace.name,
          slug: context.workspace.slug,
          kind: context.workspace.kind,
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
        memberUsed={usage.members}
        apiRateLimit={context.plan.limits.apiRequestsPerHour}
        apiBaseUrl={`${serverEnv().APP_URL.replace(/\/$/, "")}/api/v1`}
        initialTab={initialTab}
      />
    </PanelShell>
  );
}

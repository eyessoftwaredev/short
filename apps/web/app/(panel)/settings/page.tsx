import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Icon } from "@/components/kit/icon";
import { PanelShell } from "@/components/shell/panel-shell";
import { PageHeader, TabLinks, type TabLinkItem } from "@/components/ui";
import { serverEnv } from "@/lib/env";
import { listFolders } from "@/lib/folders";
import { listPixels } from "@/lib/pixels";
import { getWorkspaceUsage } from "@/lib/quota";
import {
  canAdministerWorkspace,
  canWriteWorkspace,
  hasWorkspaceRole,
  requireWorkspace,
  type WorkspaceContext,
} from "@/lib/session";
import { listApiKeys, listInvites, listMembers } from "@/lib/team";
import { listUtmTemplates } from "@/lib/utm-templates";
import { listWebhookDeliveries, listWebhooks } from "@/lib/webhooks";
import { getWorkspaceSettings } from "@/lib/workspace-settings";
import { SettingsApi } from "./settings-api";
import { SettingsDanger } from "./settings-danger";
import { SettingsGeneral } from "./settings-general";
import { SettingsLinkDefaults } from "./settings-link-defaults";
import { SettingsNotifications } from "./settings-notifications";
import { SettingsPixels } from "./settings-pixels";
import { SettingsSecurity } from "./settings-security";
import { SettingsTeam } from "./settings-team";
import { parseSettingsTab, type SettingsTabId, type WorkspaceView } from "./settings-types";
import { SettingsWebhooks } from "./settings-webhooks";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function LockedLabel({
  label,
  locked,
  lockedLabel,
}: {
  label: string;
  locked: boolean;
  lockedLabel: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      {locked ? <Icon name="lock" className="text-[11px] text-fg-subtle" aria-label={lockedLabel} /> : null}
    </span>
  );
}

/**
 * Only the active tab's data is loaded: each tab is a real `?tab=` link, so switching
 * tabs is a navigation and every tab stays bookmarkable.
 */
async function TabContent({ tab, context }: { tab: SettingsTabId; context: WorkspaceContext }) {
  const workspaceId = context.workspace.id;
  const canManage = canAdministerWorkspace(context);
  const isOwner = hasWorkspaceRole(context.role, "owner") || context.isSuperadmin;
  const workspace: WorkspaceView = {
    id: context.workspace.id,
    name: context.workspace.name,
    slug: context.workspace.slug,
    kind: context.workspace.kind,
  };

  switch (tab) {
    case "links": {
      const [settings, templates, folders] = await Promise.all([
        getWorkspaceSettings(workspaceId),
        listUtmTemplates(workspaceId),
        listFolders(workspaceId),
      ]);
      return (
        <SettingsLinkDefaults
          settings={settings}
          templates={templates}
          folders={folders.map((folder) => ({ id: folder.id, name: folder.name }))}
          canManage={canManage}
          canWrite={canWriteWorkspace(context)}
        />
      );
    }
    case "notifications": {
      const [settings, members] = await Promise.all([
        getWorkspaceSettings(workspaceId),
        listMembers(workspaceId),
      ]);
      return (
        <SettingsNotifications
          healthAlerts={settings.healthAlerts}
          weeklyDigest={settings.weeklyDigest}
          canManage={canManage}
          recipientCount={members.filter((row) => row.role === "owner" || row.role === "admin").length}
        />
      );
    }
    case "team": {
      const [members, invites, usage] = await Promise.all([
        listMembers(workspaceId),
        listInvites(workspaceId),
        getWorkspaceUsage(workspaceId),
      ]);
      return (
        <SettingsTeam
          userId={context.user.id}
          workspace={workspace}
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
          canManage={canManage}
          isOwner={isOwner}
          canCreateTeam={context.canCreateTeam}
          memberLimit={context.plan.limits.members}
          memberUsed={usage.members}
        />
      );
    }
    case "api": {
      const apiKeys = context.plan.features.apiAccess ? await listApiKeys(workspaceId) : [];
      return (
        <SettingsApi
          apiKeys={apiKeys.map((row) => ({
            id: row.id,
            name: row.name,
            start: row.start,
            enabled: row.enabled,
            requestCount: row.requestCount,
            lastRequest: row.lastRequest?.toISOString() ?? null,
            createdAt: row.createdAt.toISOString(),
          }))}
          apiBaseUrl={`${serverEnv().APP_URL.replace(/\/$/, "")}/api/v1`}
          apiRateLimit={context.plan.limits.apiRequestsPerHour}
          hasFeature={context.plan.features.apiAccess}
          canManage={canManage}
        />
      );
    }
    case "webhooks": {
      const hooks = context.plan.features.webhooks ? await listWebhooks(workspaceId) : [];
      const webhookRows = await Promise.all(
        hooks.map(async (row) => ({
          id: row.id,
          url: row.url,
          events: row.events,
          enabled: row.enabled,
          lastStatus: row.lastStatus,
          lastDeliveryAt: row.lastDeliveryAt?.toISOString() ?? null,
          lastError: row.lastError,
          deliveries: (await listWebhookDeliveries(row.id, 8)).map((delivery) => ({
            id: delivery.id,
            event: delivery.event,
            status: delivery.responseStatus,
            error: delivery.error,
            createdAt: delivery.createdAt.toISOString(),
          })),
        })),
      );
      return (
        <SettingsWebhooks
          webhookRows={webhookRows}
          hasFeature={context.plan.features.webhooks}
          canManage={canManage}
        />
      );
    }
    case "pixels": {
      const pixels = await listPixels(workspaceId);
      return (
        <SettingsPixels
          pixels={pixels.map((row) => ({
            provider: row.provider,
            pixelId: row.pixelId,
            enabled: row.enabled,
            hasToken: row.accessTokenEnc != null,
          }))}
          canManage={canManage}
        />
      );
    }
    case "security":
      return <SettingsSecurity email={context.user.email} twoFactorEnabled={context.user.twoFactorEnabled} />;
    case "danger":
      return <SettingsDanger workspace={workspace} isOwner={isOwner} />;
    case "general":
    default:
      return (
        <SettingsGeneral
          user={{ name: context.user.name, email: context.user.email }}
          workspace={workspace}
          planName={context.plan.name}
          canManage={canManage}
          isOwner={isOwner}
        />
      );
  }
}

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const [context, raw, t, tc] = await Promise.all([
    requireWorkspace(),
    searchParams,
    getTranslations("settings"),
    getTranslations("common"),
  ]);
  const tab = parseSettingsTab(raw.tab);
  const lockedLabel = tc("notInPlan");

  const labels: Record<SettingsTabId, ReactNode> = {
    general: t("tabGeneral"),
    links: t("tabLinkDefaults"),
    notifications: t("tabNotifications"),
    team: t("tabTeamMembers"),
    api: (
      <LockedLabel label={t("tabApi")} locked={!context.plan.features.apiAccess} lockedLabel={lockedLabel} />
    ),
    webhooks: (
      <LockedLabel
        label={t("tabWebhooks")}
        locked={!context.plan.features.webhooks}
        lockedLabel={lockedLabel}
      />
    ),
    pixels: t("tabPixels"),
    security: t("tabSecurity"),
    danger: <span className="text-danger">{t("tabDanger")}</span>,
  };
  const items: TabLinkItem[] = (Object.keys(labels) as SettingsTabId[]).map((id) => ({
    id,
    label: labels[id],
    href: id === "general" ? "/settings" : `/settings?tab=${id}`,
  }));

  return (
    <PanelShell title={t("title")} crumbs={[{ label: context.workspace.name }]}>
      <PageHeader
        title={t("title")}
        description={t("description")}
        tabs={<TabLinks items={items} value={tab} label={t("sectionsLabel")} />}
      />
      <div className="flex w-full max-w-4xl min-w-0 flex-col gap-6">
        <TabContent tab={tab} context={context} />
      </div>
    </PanelShell>
  );
}

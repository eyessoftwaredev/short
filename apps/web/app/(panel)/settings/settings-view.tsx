"use client";

import { Icon } from "@/components/kit/icon";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { useActionMessage } from "@/lib/action-message";
import type { WebhookEvent } from "@short/core";
import { Section, TabPanel, Tabs, type TabItem } from "@/components/ui";
import { createApiKeyAction, createTeamAction, createWebhookAction } from "./actions";
import { SettingsApi } from "./settings-api";
import { SettingsDanger } from "./settings-danger";
import { ConfirmDialog, SecretModal, SettingsBanner } from "./settings-dialogs";
import { SettingsProfile } from "./settings-profile";
import { SettingsTeam } from "./settings-team";
import { SettingsWebhooks } from "./settings-webhooks";
import type { PixelView } from "./settings-pixels";
import {
  type ActionOutcome,
  type ConfirmRequest,
  type InviteView,
  type KeyView,
  type MemberView,
  type SettingsTabId,
  type WebhookView,
} from "./settings-types";

type SettingsViewProps = {
  user: { id: string; name: string; email: string; twoFactorEnabled: boolean };
  workspace: { id: string; name: string; slug: string; kind: "personal" | "team" };
  members: MemberView[];
  invites: InviteView[];
  apiKeys: KeyView[];
  webhookRows: WebhookView[];
  pixels: PixelView[];
  canManage: boolean;
  isOwner: boolean;
  canCreateTeam: boolean;
  planName: string;
  features: { apiAccess: boolean; webhooks: boolean };
  memberLimit: number;
  memberUsed: number;
  apiRateLimit: number;
  apiBaseUrl: string;
  initialTab?: SettingsTabId;
};

function LockedLabel({ label, locked }: { label: string; locked: boolean }) {
  const tc = useTranslations("common");
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      {locked ? <Icon name="lock" className="text-xs text-fg-disabled" aria-label={tc("notInPlan")} /> : null}
    </span>
  );
}

export function SettingsView({
  user,
  workspace,
  members,
  invites,
  apiKeys,
  webhookRows,
  pixels,
  canManage,
  isOwner,
  canCreateTeam,
  planName,
  features,
  memberLimit,
  memberUsed,
  apiRateLimit,
  apiBaseUrl,
  initialTab = "profile",
}: SettingsViewProps) {
  const router = useRouter();
  const t = useTranslations("settings");
  const actionMessage = useActionMessage();
  const [tab, setTab] = useState<SettingsTabId>(initialTab);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(user.name);
  const [workspaceName, setWorkspaceName] = useState(workspace.name);
  const [newTeamName, setNewTeamName] = useState("");
  const [keyName, setKeyName] = useState("");
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [hookUrl, setHookUrl] = useState("");
  const [hookEvents, setHookEvents] = useState<WebhookEvent[]>(["link.created"]);
  const [issuedSecret, setIssuedSecret] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  function selectTab(id: SettingsTabId): void {
    setTab(id);
    const href = id === "profile" ? "/settings" : `/settings?tab=${id}`;
    router.replace(href, { scroll: false });
  }

  const isTeam = workspace.kind === "team";
  const tabs: readonly TabItem<SettingsTabId>[] = [
    { id: "profile", label: t("tabProfile") },
    { id: "team", label: t("tabTeam"), count: isTeam ? members.length : undefined },
    {
      id: "api",
      label: <LockedLabel label={t("tabApi")} locked={!features.apiAccess} />,
      count: features.apiAccess ? apiKeys.length : undefined,
    },
    {
      id: "webhooks",
      label: <LockedLabel label={t("tabWebhooks")} locked={!features.webhooks} />,
      count: features.webhooks ? webhookRows.length : undefined,
    },
    {
      id: "dangerous",
      label: <span className="text-danger">{t("tabDangerous")}</span>,
    },
  ];

  function run(action: () => Promise<ActionOutcome>, message?: string): void {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(actionMessage(result.error));
        return;
      }
      if (message) {
        setNotice(message);
      }
      router.refresh();
    });
  }

  function requestConfirm(request: ConfirmRequest): void {
    setConfirm({
      ...request,
      onConfirm: (password) => {
        request.onConfirm(password);
        setConfirm(null);
      },
    });
  }

  function createKey(): void {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await createApiKeyAction(keyName);
      if (!result.ok) {
        setError(actionMessage(result.error));
        return;
      }
      setIssuedKey(result.data.key);
      setKeyName("");
      router.refresh();
    });
  }

  function createHook(): void {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await createWebhookAction({
        url: hookUrl,
        events: hookEvents,
        enabled: true,
      });
      if (!result.ok) {
        setError(actionMessage(result.error));
        return;
      }
      setIssuedSecret(result.data.secret);
      setHookUrl("");
      router.refresh();
    });
  }

  function submitTeam(): void {
    if (newTeamName.trim().length < 2) {
      return;
    }
    run(async () => {
      const result = await createTeamAction(newTeamName);
      if (result.ok) {
        setNewTeamName("");
        router.replace("/settings?tab=team");
      }
      return result;
    }, t("teamCreated"));
  }

  return (
    <div className="flex min-w-0 max-w-3xl flex-col gap-8" aria-busy={pending}>
      <Tabs items={tabs} value={tab} onChange={selectTab} />

      {error ? (
        <SettingsBanner tone="danger" onDismiss={() => setError(null)}>
          {error}
        </SettingsBanner>
      ) : null}
      {notice ? (
        <SettingsBanner tone="accent" onDismiss={() => setNotice(null)}>
          {notice}
        </SettingsBanner>
      ) : null}

      <TabPanel active={tab === "profile"}>
        <SettingsProfile
          user={user}
          displayName={displayName}
          onDisplayNameChange={setDisplayName}
          pending={pending}
          run={run}
        />
      </TabPanel>

      <TabPanel active={tab === "team"}>
        <SettingsTeam
          userId={user.id}
          workspace={workspace}
          workspaceName={workspaceName}
          onWorkspaceNameChange={setWorkspaceName}
          newTeamName={newTeamName}
          onNewTeamNameChange={setNewTeamName}
          onCreateTeam={submitTeam}
          members={members}
          invites={invites}
          pixels={pixels}
          canManage={canManage}
          isOwner={isOwner}
          canCreateTeam={canCreateTeam}
          planName={planName}
          memberLimit={memberLimit}
          memberUsed={memberUsed}
          pending={pending}
          run={run}
          requestConfirm={requestConfirm}
        />
      </TabPanel>

      <TabPanel active={tab === "api"}>
        <Section title={t("apiTitle")} description={t("apiDescription")}>
          <SettingsApi
            apiKeys={apiKeys}
            apiBaseUrl={apiBaseUrl}
            apiRateLimit={apiRateLimit}
            hasFeature={features.apiAccess}
            canManage={canManage}
            pending={pending}
            keyName={keyName}
            onKeyNameChange={setKeyName}
            onCreateKey={createKey}
            run={run}
            requestConfirm={requestConfirm}
          />
        </Section>
      </TabPanel>

      <TabPanel active={tab === "webhooks"}>
        <Section title={t("webhooksTitle")} description={t("webhooksDescription")}>
          <SettingsWebhooks
            webhookRows={webhookRows}
            hasFeature={features.webhooks}
            canManage={canManage}
            pending={pending}
            hookUrl={hookUrl}
            hookEvents={hookEvents}
            onHookUrlChange={setHookUrl}
            onHookEventsChange={setHookEvents}
            onCreateHook={createHook}
            run={run}
            requestConfirm={requestConfirm}
          />
        </Section>
      </TabPanel>

      <TabPanel active={tab === "dangerous"}>
        <SettingsDanger
          workspace={workspace}
          isOwner={isOwner}
          pending={pending}
          run={run}
          requestConfirm={requestConfirm}
        />
      </TabPanel>

      <SecretModal
        open={issuedKey !== null}
        kind="apiKey"
        secret={issuedKey ?? ""}
        usage={t("apiKeyUsage", { url: apiBaseUrl })}
        onDismiss={() => setIssuedKey(null)}
      />

      <SecretModal
        open={issuedSecret !== null}
        kind="signingSecret"
        secret={issuedSecret ?? ""}
        usage={t("signingSecretUsage")}
        onDismiss={() => setIssuedSecret(null)}
      />

      <ConfirmDialog request={confirm} pending={pending} onCancel={() => setConfirm(null)} />
    </div>
  );
}

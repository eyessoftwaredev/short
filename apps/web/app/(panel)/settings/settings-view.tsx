"use client";

import { Icon } from "@/components/kit/icon";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { useActionMessage } from "@/lib/action-message";
import type { WebhookEvent } from "@short/core";
import { initials } from "@/components/providers/session-provider";
import {
  Avatar,
  Badge,
  Card,
  CopyButton,
  Field,
  Input,
  SaveBar,
  Section,
  TabPanel,
  Tabs,
  type TabItem,
} from "@/components/ui";
import {
  createApiKeyAction,
  createWebhookAction,
  deleteTeamAction,
  updateProfileAction,
  updateWorkspaceAction,
} from "./actions";
import { SettingsApi } from "./settings-api";
import { ConfirmDialog, DangerButton, SecretModal, SettingsBanner } from "./settings-dialogs";
import { SettingsMembers } from "./settings-members";
import { SettingsWebhooks } from "./settings-webhooks";
import type {
  ActionOutcome,
  ConfirmRequest,
  InviteView,
  KeyView,
  MemberView,
  SettingsTabId,
  WebhookView,
} from "./settings-types";

type SettingsViewProps = {
  user: { id: string; name: string; email: string };
  workspace: { id: string; name: string; slug: string; kind: "personal" | "team" };
  members: MemberView[];
  invites: InviteView[];
  apiKeys: KeyView[];
  webhookRows: WebhookView[];
  canManage: boolean;
  isOwner: boolean;
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
  canManage,
  isOwner,
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
  const tc = useTranslations("common");
  const actionMessage = useActionMessage();
  const [tab, setTab] = useState<SettingsTabId>(initialTab);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(user.name);
  const [workspaceName, setWorkspaceName] = useState(workspace.name);
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
    { id: "workspace", label: isTeam ? t("tabTeam") : t("tabAccount") },
    ...(isTeam ? [{ id: "members" as const, label: t("tabMembers"), count: members.length }] : []),
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
      onConfirm: () => {
        request.onConfirm();
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

  const profileDirty = displayName.trim() !== user.name;
  const workspaceDirty = workspaceName.trim() !== workspace.name;

  return (
    <div className="flex min-w-0 flex-col gap-6" aria-busy={pending}>
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
        <Section title={t("profileTitle")} description={t("profileDescription")}>
          <div className="flex min-w-0 flex-col gap-4">
            <Card staticHover className="max-w-xl gap-5">
              <span className="flex min-w-0 items-center gap-3">
                <Avatar size="lg" aria-hidden="true">
                  {initials(displayName || user.name, user.email)}
                </Avatar>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">
                    {displayName.trim() || user.name}
                  </span>
                  <span className="truncate font-mono text-xs text-fg-muted">{user.email}</span>
                </span>
              </span>

              <Field label={t("displayName")} hint={t("displayNameHint")}>
                <Input
                  value={displayName}
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </Field>

              <Field label={t("email")} hint={t("emailHint")}>
                <Input value={user.email} readOnly disabled autoComplete="email" />
              </Field>
            </Card>

            <SaveBar
              dirty={profileDirty}
              saving={pending}
              message={t("unsavedProfile")}
              saveLabel={tc("save")}
              resetLabel={tc("cancel")}
              onReset={() => setDisplayName(user.name)}
              onSave={() => run(() => updateProfileAction(displayName), t("profileUpdated"))}
              className="max-w-xl"
            />
          </div>
        </Section>
      </TabPanel>

      <TabPanel active={tab === "workspace"}>
        <Section
          title={isTeam ? t("teamTitle") : t("workspaceTitle")}
          description={isTeam ? t("workspaceDescription") : t("personalDescription")}
        >
          <div className="flex min-w-0 flex-col gap-4">
            <Card staticHover className="max-w-xl gap-5">
              <Field
                label={t("workspaceName")}
                hint={canManage ? t("workspaceNameHint") : t("workspaceNameLocked")}
              >
                <Input
                  value={workspaceName}
                  minLength={2}
                  maxLength={80}
                  disabled={!canManage}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                />
              </Field>

              <dl className="m-0 flex min-w-0 flex-col gap-3 border-t border-border pt-4">
                {isTeam ? (
                  <>
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                      <dt className="text-sm text-fg-muted">{t("workspaceCode")}</dt>
                      <dd className="m-0 flex min-w-0 items-center gap-1.5">
                        <code className="min-w-0 truncate font-mono text-sm">{workspace.slug}</code>
                        <CopyButton value={workspace.slug} iconOnly label={t("copyWorkspaceCode")} />
                      </dd>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                      <dt className="text-sm text-fg-muted">{t("workspaceId")}</dt>
                      <dd className="m-0 flex min-w-0 items-center gap-1.5">
                        <code className="min-w-0 truncate font-mono text-xs text-fg-muted">
                          {workspace.id}
                        </code>
                        <CopyButton value={workspace.id} iconOnly label={t("copyWorkspaceId")} />
                      </dd>
                    </div>
                  </>
                ) : null}
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <dt className="text-sm text-fg-muted">{t("kind")}</dt>
                  <dd className="m-0">
                    <Badge tone="muted">{isTeam ? t("kindTeam") : t("kindPersonal")}</Badge>
                  </dd>
                </div>
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <dt className="text-sm text-fg-muted">{t("plan")}</dt>
                  <dd className="m-0">
                    <Badge tone="accent">{planName}</Badge>
                  </dd>
                </div>
              </dl>

              {isTeam ? (
                <p className="m-0 text-xs leading-relaxed text-fg-subtle">{t("workspaceCodeHint")}</p>
              ) : null}
            </Card>

            <SaveBar
              dirty={workspaceDirty && canManage}
              saving={pending}
              message={t("unsavedWorkspace")}
              saveLabel={tc("save")}
              resetLabel={tc("cancel")}
              onReset={() => setWorkspaceName(workspace.name)}
              onSave={() => run(() => updateWorkspaceAction(workspaceName), t("workspaceUpdated"))}
              className="max-w-xl"
            />

            {isTeam && isOwner ? (
              <Card staticHover className="max-w-xl gap-3 border-danger">
                <span className="text-sm font-medium text-danger">{t("deleteTeam")}</span>
                <p className="m-0 text-sm text-fg-muted">{t("deleteTeamBody")}</p>
                <DangerButton
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    requestConfirm({
                      title: t("deleteTeamTitle", { name: workspace.name }),
                      description: t("deleteTeamConfirm"),
                      consequences: [t("deleteTeamKeepAccount")],
                      confirmLabel: t("deleteTeam"),
                      onConfirm: () =>
                        run(async () => {
                          const result = await deleteTeamAction();
                          if (result.ok) {
                            router.push("/dashboard");
                          }
                          return result;
                        }),
                    })
                  }
                >
                  {t("deleteTeam")}
                </DangerButton>
              </Card>
            ) : null}
          </div>
        </Section>
      </TabPanel>

      <TabPanel active={tab === "members"}>
        <Section title={t("membersTitle")} description={t("membersDescription")}>
          <SettingsMembers
            currentUserId={user.id}
            members={members}
            invites={invites}
            canManage={canManage}
            isOwner={isOwner}
            memberLimit={memberLimit}
            memberUsed={memberUsed}
            pending={pending}
            run={run}
            requestConfirm={requestConfirm}
          />
        </Section>
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

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Lock } from "lucide-react";
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
  updateProfileAction,
  updateWorkspaceAction,
} from "./actions";
import { SettingsApi } from "./settings-api";
import { ConfirmDialog, SecretModal, SettingsBanner } from "./settings-dialogs";
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
  workspace: { id: string; name: string; slug: string };
  members: MemberView[];
  invites: InviteView[];
  apiKeys: KeyView[];
  webhookRows: WebhookView[];
  canManage: boolean;
  isOwner: boolean;
  planName: string;
  features: { apiAccess: boolean; webhooks: boolean };
  memberLimit: number;
  apiRateLimit: number;
  apiBaseUrl: string;
  initialTab?: SettingsTabId;
};

function LockedLabel({ label, locked }: { label: string; locked: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      {locked ? <Lock className="size-3 text-fg-disabled" aria-label="not in your plan" /> : null}
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
  apiRateLimit,
  apiBaseUrl,
  initialTab = "profile",
}: SettingsViewProps) {
  const router = useRouter();
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

  const tabs: readonly TabItem<SettingsTabId>[] = [
    { id: "profile", label: "Profile" },
    { id: "workspace", label: "Workspace" },
    { id: "members", label: "Members", count: members.length },
    {
      id: "api",
      label: <LockedLabel label="API keys" locked={!features.apiAccess} />,
      count: features.apiAccess ? apiKeys.length : undefined,
    },
    {
      id: "webhooks",
      label: <LockedLabel label="Webhooks" locked={!features.webhooks} />,
      count: features.webhooks ? webhookRows.length : undefined,
    },
  ];

  function run(action: () => Promise<ActionOutcome>, message?: string): void {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
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
        setError(result.error);
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
        setError(result.error);
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
        <Section
          title="Your profile"
          description="How you appear to teammates in member lists and activity."
        >
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

              <Field label="Display name" hint="Between 2 and 80 characters.">
                <Input
                  value={displayName}
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </Field>

              <Field
                label="Email"
                hint="Your sign-in address. Contact support to change it — links and audit history are tied to it."
              >
                <Input value={user.email} readOnly disabled autoComplete="email" />
              </Field>
            </Card>

            <SaveBar
              dirty={profileDirty}
              saving={pending}
              message="Unsaved profile changes"
              onReset={() => setDisplayName(user.name)}
              onSave={() => run(() => updateProfileAction(displayName), "Profile updated.")}
              className="max-w-xl"
            />
          </div>
        </Section>
      </TabPanel>

      <TabPanel active={tab === "workspace"}>
        <Section
          title="Workspace"
          description="The name your team sees in the switcher and on shared surfaces."
        >
          <div className="flex min-w-0 flex-col gap-4">
            <Card staticHover className="max-w-xl gap-5">
              <Field
                label="Workspace name"
                hint={
                  canManage
                    ? "Between 2 and 80 characters."
                    : "Only owners and admins can rename the workspace."
                }
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
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <dt className="text-sm text-fg-muted">Slug</dt>
                  <dd className="m-0 flex min-w-0 items-center gap-1.5">
                    <code className="min-w-0 truncate font-mono text-sm">{workspace.slug}</code>
                    <CopyButton value={workspace.slug} iconOnly label="Copy slug" />
                  </dd>
                </div>
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <dt className="text-sm text-fg-muted">Workspace ID</dt>
                  <dd className="m-0 flex min-w-0 items-center gap-1.5">
                    <code className="min-w-0 truncate font-mono text-xs text-fg-muted">
                      {workspace.id}
                    </code>
                    <CopyButton value={workspace.id} iconOnly label="Copy workspace ID" />
                  </dd>
                </div>
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <dt className="text-sm text-fg-muted">Plan</dt>
                  <dd className="m-0">
                    <Badge tone="accent">{planName}</Badge>
                  </dd>
                </div>
              </dl>

              <p className="m-0 text-xs leading-relaxed text-fg-subtle">
                The slug appears in invitation links and cannot be changed here — contact support if
                it has to move.
              </p>
            </Card>

            <SaveBar
              dirty={workspaceDirty && canManage}
              saving={pending}
              message="Unsaved workspace changes"
              onReset={() => setWorkspaceName(workspace.name)}
              onSave={() => run(() => updateWorkspaceAction(workspaceName), "Workspace updated.")}
              className="max-w-xl"
            />
          </div>
        </Section>
      </TabPanel>

      <TabPanel active={tab === "members"}>
        <Section
          title="Members and access"
          description="Who can reach this workspace, and how much they can change once they are in."
        >
          <SettingsMembers
            currentUserId={user.id}
            members={members}
            invites={invites}
            canManage={canManage}
            isOwner={isOwner}
            memberLimit={memberLimit}
            pending={pending}
            run={run}
            requestConfirm={requestConfirm}
          />
        </Section>
      </TabPanel>

      <TabPanel active={tab === "api"}>
        <Section
          title="API keys"
          description="Keys are scoped to this workspace and authenticate every REST API call."
        >
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
        <Section
          title="Webhooks"
          description="Outbound events, signed so your backend can prove they came from us."
        >
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
        kind="API key"
        secret={issuedKey ?? ""}
        usage={`Send it as an Authorization: Bearer header against ${apiBaseUrl}.`}
        onDismiss={() => setIssuedKey(null)}
      />

      <SecretModal
        open={issuedSecret !== null}
        kind="Signing secret"
        secret={issuedSecret ?? ""}
        usage="Use it to recompute the x-short-signature header and reject deliveries that do not match."
        onDismiss={() => setIssuedSecret(null)}
      />

      <ConfirmDialog request={confirm} pending={pending} onCancel={() => setConfirm(null)} />
    </div>
  );
}

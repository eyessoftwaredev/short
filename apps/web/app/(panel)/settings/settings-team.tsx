"use client";

import { useTranslations } from "next-intl";
import { Badge, Button, CopyButton, Field, Input, SaveBar, Section } from "@/components/ui";
import { SettingsCard } from "./settings-card";
import { SettingsMembers } from "./settings-members";
import { SettingsPixels, type PixelView } from "./settings-pixels";
import type { InviteView, MemberView, RequestConfirm, RunAction } from "./settings-types";
import { updateWorkspaceAction } from "./actions";

type WorkspaceView = { id: string; name: string; slug: string; kind: "personal" | "team" };

type SettingsTeamProps = {
  userId: string;
  workspace: WorkspaceView;
  workspaceName: string;
  onWorkspaceNameChange: (value: string) => void;
  newTeamName: string;
  onNewTeamNameChange: (value: string) => void;
  onCreateTeam: () => void;
  members: MemberView[];
  invites: InviteView[];
  pixels: PixelView[];
  canManage: boolean;
  isOwner: boolean;
  canCreateTeam: boolean;
  planName: string;
  memberLimit: number;
  memberUsed: number;
  pending: boolean;
  run: RunAction;
  requestConfirm: RequestConfirm;
};

export function SettingsTeam({
  userId,
  workspace,
  workspaceName,
  onWorkspaceNameChange,
  newTeamName,
  onNewTeamNameChange,
  onCreateTeam,
  members,
  invites,
  pixels,
  canManage,
  isOwner,
  canCreateTeam,
  planName,
  memberLimit,
  memberUsed,
  pending,
  run,
  requestConfirm,
}: SettingsTeamProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const isTeam = workspace.kind === "team";
  const dirty = workspaceName.trim() !== workspace.name;

  if (!isTeam) {
    return (
      <Section title={t("teamTitle")} description={t("personalDescription")}>
        <div className="flex min-w-0 flex-col gap-8">
          <SettingsCard
            title={t("createTeam")}
            description={t("createTeamDescription")}
            footer={
              canCreateTeam ? (
                <Button
                  variant="primary"
                  disabled={pending || newTeamName.trim().length < 2}
                  onClick={onCreateTeam}
                >
                  {t("createTeam")}
                </Button>
              ) : (
                <Button href="/billing" variant="primary">
                  {tc("createTeamUpgrade")}
                </Button>
              )
            }
          >
            {canCreateTeam ? (
              <Field label={t("teamName")}>
                <Input
                  value={newTeamName}
                  minLength={2}
                  maxLength={80}
                  autoComplete="off"
                  onChange={(event) => onNewTeamNameChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onCreateTeam();
                    }
                  }}
                />
              </Field>
            ) : null}
          </SettingsCard>
          <SettingsPixels pixels={pixels} canManage={canManage} run={run} pending={pending} />
        </div>
      </Section>
    );
  }

  return (
    <Section title={t("teamTitle")} description={t("workspaceDescription")}>
      <div className="flex min-w-0 flex-col gap-8">
        <SettingsCard title={t("workspaceName")} description={t("workspaceCodeHint")}>
          <Field
            label={t("workspaceName")}
            hint={canManage ? t("workspaceNameHint") : t("workspaceNameLocked")}
          >
            <Input
              value={workspaceName}
              minLength={2}
              maxLength={80}
              disabled={!canManage}
              onChange={(event) => onWorkspaceNameChange(event.target.value)}
            />
          </Field>
          <dl className="m-0 flex min-w-0 flex-col gap-3 border-t border-border pt-4">
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
                <code className="min-w-0 truncate font-mono text-xs text-fg-muted">{workspace.id}</code>
                <CopyButton value={workspace.id} iconOnly label={t("copyWorkspaceId")} />
              </dd>
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <dt className="text-sm text-fg-muted">{t("plan")}</dt>
              <dd className="m-0">
                <Badge tone="accent">{planName}</Badge>
              </dd>
            </div>
          </dl>
        </SettingsCard>

        <SaveBar
          dirty={dirty && canManage}
          saving={pending}
          message={t("unsavedWorkspace")}
          saveLabel={tc("save")}
          resetLabel={tc("cancel")}
          onReset={() => onWorkspaceNameChange(workspace.name)}
          onSave={() => run(() => updateWorkspaceAction(workspaceName), t("workspaceUpdated"))}
        />

        <SettingsMembers
          currentUserId={userId}
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

        <SettingsPixels pixels={pixels} canManage={canManage} run={run} pending={pending} />
      </div>
    </Section>
  );
}

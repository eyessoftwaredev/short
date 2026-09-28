"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { initials } from "@/components/providers/session-provider";
import { Avatar, Badge, Button, CopyField, Input, SectionCard, SettingsRow } from "@/components/ui";
import { updateProfileAction, updateWorkspaceAction } from "./actions";
import { useSettingsAction } from "./settings-dialogs";
import type { WorkspaceView } from "./settings-types";

type SettingsGeneralProps = {
  user: { name: string; email: string };
  workspace: WorkspaceView;
  planName: string;
  canManage: boolean;
  isOwner: boolean;
};

export function SettingsGeneral({ user, workspace, planName, canManage, isOwner }: SettingsGeneralProps) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ProfileCard user={user} />
      {workspace.kind === "team" ? (
        <TeamWorkspaceCard
          workspace={workspace}
          planName={planName}
          canManage={canManage}
          isOwner={isOwner}
        />
      ) : (
        <PersonalWorkspaceCard planName={planName} />
      )}
    </div>
  );
}

function ProfileCard({ user }: { user: { name: string; email: string } }) {
  const t = useTranslations("settings");
  const { pending, run } = useSettingsAction();
  const [name, setName] = useState(user.name);
  const trimmed = name.trim();
  const dirty = trimmed !== user.name;
  const valid = trimmed.length >= 2 && trimmed.length <= 80;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (dirty && valid) {
          void run(() => updateProfileAction(name), t("profileUpdated"));
        }
      }}
    >
      <SectionCard
        id="profile"
        title={t("profileTitle")}
        description={t("profileDescription")}
        actions={
          <span className="flex min-w-0 items-center gap-2.5">
            <Avatar aria-hidden="true">{initials(trimmed || user.name, user.email)}</Avatar>
            <span className="hidden min-w-0 flex-col sm:flex">
              <span className="truncate text-sm font-medium text-ink">{trimmed || user.name}</span>
              <span className="truncate font-mono text-xs text-fg-muted">{user.email}</span>
            </span>
          </span>
        }
        footer={
          <>
            {dirty ? (
              <Button type="button" variant="ghost" disabled={pending} onClick={() => setName(user.name)}>
                {t("discardChanges")}
              </Button>
            ) : null}
            <Button type="submit" variant="primary" loading={pending} disabled={!dirty || !valid}>
              {t("saveProfile")}
            </Button>
          </>
        }
      >
        <SettingsRow
          label={t("displayName")}
          description={t("displayNameHint")}
          info={t("displayNameInfo")}
          htmlFor="settings-display-name"
        >
          <Input
            id="settings-display-name"
            value={name}
            minLength={2}
            maxLength={80}
            autoComplete="name"
            aria-invalid={!valid || undefined}
            onChange={(event) => setName(event.target.value)}
          />
        </SettingsRow>
        <SettingsRow
          label={t("email")}
          description={t("emailMovedHint")}
          info={t("emailInfo")}
          htmlFor="settings-email"
        >
          <Input id="settings-email" value={user.email} readOnly disabled autoComplete="email" />
          <Button
            size="sm"
            variant="ghost"
            href="/settings?tab=security"
            className="self-start"
            trailingIcon="arrow-right"
          >
            {t("changeEmailLink")}
          </Button>
        </SettingsRow>
      </SectionCard>
    </form>
  );
}

function TeamWorkspaceCard({
  workspace,
  planName,
  canManage,
  isOwner,
}: {
  workspace: WorkspaceView;
  planName: string;
  canManage: boolean;
  isOwner: boolean;
}) {
  const t = useTranslations("settings");
  const { pending, run } = useSettingsAction();
  const [name, setName] = useState(workspace.name);
  const trimmed = name.trim();
  const dirty = trimmed !== workspace.name;
  const valid = trimmed.length >= 2 && trimmed.length <= 80;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canManage && dirty && valid) {
          void run(() => updateWorkspaceAction(name), t("workspaceUpdated"));
        }
      }}
    >
      <SectionCard
        id="workspace"
        title={t("teamTitle")}
        description={t("workspaceDescription")}
        actions={<Badge tone="neutral">{t("kindTeam")}</Badge>}
        footer={
          canManage ? (
            <>
              {dirty ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setName(workspace.name)}
                >
                  {t("discardChanges")}
                </Button>
              ) : null}
              <Button type="submit" variant="primary" loading={pending} disabled={!dirty || !valid}>
                {t("saveWorkspace")}
              </Button>
            </>
          ) : (
            <span className="mr-auto text-[13px] text-fg-subtle">{t("workspaceNameLocked")}</span>
          )
        }
      >
        <SettingsRow
          label={t("workspaceName")}
          description={t("workspaceNameHint")}
          info={t("workspaceNameInfo")}
          htmlFor="settings-workspace-name"
        >
          <Input
            id="settings-workspace-name"
            value={name}
            minLength={2}
            maxLength={80}
            disabled={!canManage}
            aria-invalid={!valid || undefined}
            onChange={(event) => setName(event.target.value)}
          />
        </SettingsRow>
        <SettingsRow
          label={t("workspaceCode")}
          description={t("workspaceCodeHint")}
          info={t("workspaceCodeInfo")}
        >
          <CopyField value={workspace.slug} size="sm" copyLabel={t("copyWorkspaceCode")} />
        </SettingsRow>
        <SettingsRow label={t("workspaceId")} description={t("workspaceIdHint")} info={t("workspaceIdInfo")}>
          <CopyField value={workspace.id} size="sm" copyLabel={t("copyWorkspaceId")} />
        </SettingsRow>
        <SettingsRow label={t("plan")} description={t("planHint")}>
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{planName}</Badge>
            {isOwner ? (
              <Button size="sm" variant="ghost" href="/billing" trailingIcon="arrow-right">
                {t("managePlan")}
              </Button>
            ) : null}
          </span>
        </SettingsRow>
      </SectionCard>
    </form>
  );
}

function PersonalWorkspaceCard({ planName }: { planName: string }) {
  const t = useTranslations("settings");
  return (
    <SectionCard
      id="workspace"
      title={t("personalTitle")}
      description={t("personalDescription")}
      actions={<Badge tone="neutral">{t("kindPersonal")}</Badge>}
    >
      <SettingsRow label={t("plan")} description={t("planHint")}>
        <span className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{planName}</Badge>
          <Button size="sm" variant="ghost" href="/billing" trailingIcon="arrow-right">
            {t("managePlan")}
          </Button>
        </span>
      </SettingsRow>
      <SettingsRow label={t("workWithOthers")} description={t("workWithOthersDesc")}>
        <Button leadingIcon="users" href="/settings?tab=team" className="self-start">
          {t("createTeam")}
        </Button>
      </SettingsRow>
    </SectionCard>
  );
}

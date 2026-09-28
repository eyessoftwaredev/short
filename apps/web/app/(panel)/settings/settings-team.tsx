"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge, Button, Callout, EmptyState, Input, SectionCard, SettingsRow } from "@/components/ui";
import { createTeamAction } from "./actions";
import { SettingsMembers } from "./settings-members";
import { useSettingsAction } from "./settings-dialogs";
import { ROLE_COPY, type InviteView, type MemberView, type WorkspaceView } from "./settings-types";

type SettingsTeamProps = {
  userId: string;
  workspace: WorkspaceView;
  members: MemberView[];
  invites: InviteView[];
  canManage: boolean;
  isOwner: boolean;
  canCreateTeam: boolean;
  memberLimit: number;
  memberUsed: number;
};

export function SettingsTeam({
  userId,
  workspace,
  members,
  invites,
  canManage,
  isOwner,
  canCreateTeam,
  memberLimit,
  memberUsed,
}: SettingsTeamProps) {
  if (workspace.kind !== "team") {
    return (
      <div className="flex min-w-0 flex-col gap-6">
        <PersonalTeamIntro />
        <CreateTeamCard canCreateTeam={canCreateTeam} />
        <RolesGuide />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <SettingsMembers
        currentUserId={userId}
        members={members}
        invites={invites}
        canManage={canManage}
        isOwner={isOwner}
        memberLimit={memberLimit}
        memberUsed={memberUsed}
      />
      <RolesGuide />
    </div>
  );
}

function PersonalTeamIntro() {
  const t = useTranslations("settings");
  return (
    <EmptyState tone="first-run" icon="users" title={t("teamEmptyTitle")} description={t("teamEmptyBody")} />
  );
}

/** Visible roles guide — the same copy as the ⓘ next to every role picker. */
export function RolesGuide() {
  const t = useTranslations("settings");
  return (
    <SectionCard id="roles" title={t("rolesHeading")} description={t("rolesDescription")} divided={false}>
      <dl className="m-0 grid min-w-0 gap-4 sm:grid-cols-3">
        {(["owner", "admin", "member"] as const).map((role) => (
          <div key={role} className="flex min-w-0 flex-col gap-1.5 rounded-default bg-surface-subtle p-4">
            <dt>
              <Badge tone={role === "owner" ? "accent" : "neutral"}>{t(ROLE_COPY[role].label)}</Badge>
            </dt>
            <dd className="m-0 text-[13px] leading-5 text-fg-muted">{t(ROLE_COPY[role].summary)}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}

function CreateTeamCard({ canCreateTeam }: { canCreateTeam: boolean }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const router = useRouter();
  const { pending, run } = useSettingsAction();
  const [name, setName] = useState("");
  const valid = name.trim().length >= 2 && name.trim().length <= 80;

  async function submit(): Promise<void> {
    if (pending || !valid) {
      return;
    }
    const ok = await run(() => createTeamAction(name), t("teamCreated"));
    if (ok) {
      setName("");
      router.replace("/settings?tab=team");
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <SectionCard
        id="create-team"
        title={t("createTeam")}
        description={t("createTeamDescription")}
        footer={
          canCreateTeam ? (
            <Button type="submit" variant="primary" leadingIcon="plus" loading={pending} disabled={!valid}>
              {t("createTeam")}
            </Button>
          ) : (
            <Button href="/billing" variant="primary" leadingIcon="rocket">
              {tc("createTeamUpgrade")}
            </Button>
          )
        }
      >
        {canCreateTeam ? (
          <SettingsRow
            label={t("teamName")}
            description={t("teamNameHint")}
            info={t("teamNameInfo")}
            htmlFor="new-team-name"
          >
            <Input
              id="new-team-name"
              value={name}
              minLength={2}
              maxLength={80}
              autoComplete="off"
              placeholder={t("teamNamePlaceholder")}
              onChange={(event) => setName(event.target.value)}
            />
          </SettingsRow>
        ) : (
          <div className="py-5">
            <Callout tone="accent" title={t("createTeamLockedTitle")}>
              {t("createTeamLockedBody")}
            </Callout>
          </div>
        )}
      </SectionCard>
    </form>
  );
}

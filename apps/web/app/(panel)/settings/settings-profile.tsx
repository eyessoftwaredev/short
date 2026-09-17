"use client";

import { useTranslations } from "next-intl";
import { initials } from "@/components/providers/session-provider";
import { Avatar, Field, Input, SaveBar, Section } from "@/components/ui";
import { SettingsAccount } from "./settings-account";
import { SettingsCard } from "./settings-card";
import type { RunAction } from "./settings-types";
import { updateProfileAction } from "./actions";

type SettingsProfileProps = {
  user: { name: string; email: string; twoFactorEnabled: boolean };
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  pending: boolean;
  run: RunAction;
};

export function SettingsProfile({
  user,
  displayName,
  onDisplayNameChange,
  pending,
  run,
}: SettingsProfileProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const dirty = displayName.trim() !== user.name;

  return (
    <Section title={t("profileTitle")} description={t("profileDescription")}>
      <div className="flex min-w-0 flex-col gap-8">
        <SettingsCard title={t("identityTitle")} description={t("identityDescription")}>
          <span className="flex min-w-0 items-center gap-3">
            <Avatar size="lg" aria-hidden="true">
              {initials(displayName || user.name, user.email)}
            </Avatar>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{displayName.trim() || user.name}</span>
              <span className="truncate font-mono text-xs text-fg-muted">{user.email}</span>
            </span>
          </span>
          <Field label={t("displayName")} hint={t("displayNameHint")}>
            <Input
              value={displayName}
              minLength={2}
              maxLength={80}
              autoComplete="name"
              onChange={(event) => onDisplayNameChange(event.target.value)}
            />
          </Field>
          <Field label={t("email")} hint={t("emailHint")}>
            <Input value={user.email} readOnly disabled autoComplete="email" />
          </Field>
        </SettingsCard>

        <SaveBar
          dirty={dirty}
          saving={pending}
          message={t("unsavedProfile")}
          saveLabel={tc("save")}
          resetLabel={tc("cancel")}
          onReset={() => onDisplayNameChange(user.name)}
          onSave={() => run(() => updateProfileAction(displayName), t("profileUpdated"))}
        />

        <SettingsAccount email={user.email} twoFactorEnabled={user.twoFactorEnabled} run={run} pending={pending} />
      </div>
    </Section>
  );
}

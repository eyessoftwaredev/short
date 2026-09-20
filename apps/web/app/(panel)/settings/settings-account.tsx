"use client";

import { Button, Field, Input } from "@/components/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { changeEmailAction, changePasswordAction } from "./actions";
import { SettingsCard } from "./settings-card";
import { SettingsTwoFactor } from "./settings-two-factor";
import type { RunAction } from "./settings-types";

export function SettingsAccount({
  email,
  twoFactorEnabled,
  run,
  pending,
}: {
  email: string;
  twoFactorEnabled: boolean;
  run: RunAction;
  pending: boolean;
}) {
  const t = useTranslations("settings");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [nextEmail, setNextEmail] = useState(email);

  return (
    <SettingsCard title={t("securityTitle")} description={t("securityDesc")}>
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex min-w-0 flex-col gap-3">
          <Field label={t("changeEmail")}>
            <Input
              type="email"
              value={nextEmail}
              onChange={(event) => setNextEmail(event.target.value)}
            />
          </Field>
          <Button
            className="self-start"
            disabled={pending || nextEmail === email}
            onClick={() => run(() => changeEmailAction(nextEmail), t("emailUpdated"))}
          >
            {t("saveEmail")}
          </Button>
        </div>

        <div className="flex min-w-0 flex-col gap-3 border-t border-border pt-5">
          <Field label={t("currentPassword")}>
            <Input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </Field>
          <Field label={t("newPassword")}>
            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              minLength={10}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </Field>
          <Button
            className="self-start"
            disabled={pending || currentPassword === "" || newPassword.length < 10}
            onClick={() =>
              run(() => changePasswordAction(currentPassword, newPassword), t("passwordUpdated"))
            }
          >
            {t("savePassword")}
          </Button>
        </div>

        <SettingsTwoFactor twoFactorEnabled={twoFactorEnabled} embedded />
      </div>
    </SettingsCard>
  );
}

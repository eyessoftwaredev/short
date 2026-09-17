"use client";

import { Button, Card, Field, Input, Section } from "@/components/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { changeEmailAction, changePasswordAction } from "./actions";
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
    <div className="flex min-w-0 flex-col gap-6">
      <Section title={t("securityTitle")} description={t("securityDesc")}>
        <Card staticHover className="max-w-xl gap-4">
          <Field label={t("changeEmail")}>
            <Input
              type="email"
              value={nextEmail}
              onChange={(event) => setNextEmail(event.target.value)}
            />
          </Field>
          <Button
            disabled={pending || nextEmail === email}
            onClick={() => run(() => changeEmailAction(nextEmail), t("emailUpdated"))}
          >
            {t("saveEmail")}
          </Button>
        </Card>

        <Card staticHover className="max-w-xl gap-4">
          <Field label={t("currentPassword")}>
            <Input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </Field>
          <Field label={t("newPassword")}>
            <Input
              type="password"
              value={newPassword}
              minLength={10}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </Field>
          <Button
            disabled={pending || currentPassword === "" || newPassword.length < 10}
            onClick={() =>
              run(
                () => changePasswordAction(currentPassword, newPassword),
                t("passwordUpdated"),
              )
            }
          >
            {t("savePassword")}
          </Button>
        </Card>

        <SettingsTwoFactor twoFactorEnabled={twoFactorEnabled} />
      </Section>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button, Input, SectionCard, SettingsRow } from "@/components/ui";
import { changeEmailAction, changePasswordAction } from "./actions";
import { useSettingsAction } from "./settings-dialogs";
import { SettingsTwoFactor } from "./settings-two-factor";

const MIN_PASSWORD = 10;

export function SettingsSecurity({ email, twoFactorEnabled }: { email: string; twoFactorEnabled: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <EmailCard email={email} />
      <PasswordCard />
      <SettingsTwoFactor twoFactorEnabled={twoFactorEnabled} />
    </div>
  );
}

function EmailCard({ email }: { email: string }) {
  const t = useTranslations("settings");
  const { pending, run } = useSettingsAction();
  const [nextEmail, setNextEmail] = useState(email);
  const changed = nextEmail.trim().toLowerCase() !== email.toLowerCase();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail.trim());

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (changed && valid) {
          void run(() => changeEmailAction(nextEmail), t("emailUpdated"));
        }
      }}
    >
      <SectionCard
        id="email"
        title={t("emailTitle")}
        description={t("emailDescription")}
        footer={
          <Button type="submit" variant="primary" loading={pending} disabled={!changed || !valid}>
            {t("saveEmail")}
          </Button>
        }
      >
        <SettingsRow
          label={t("changeEmail")}
          description={t("emailHint")}
          info={t("changeEmailInfo")}
          htmlFor="new-email"
        >
          <Input
            id="new-email"
            type="email"
            autoComplete="email"
            value={nextEmail}
            onChange={(event) => setNextEmail(event.target.value)}
          />
        </SettingsRow>
      </SectionCard>
    </form>
  );
}

function PasswordCard() {
  const t = useTranslations("settings");
  const { pending, run } = useSettingsAction();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const tooShort = newPassword.length > 0 && newPassword.length < MIN_PASSWORD;
  const ready = currentPassword !== "" && newPassword.length >= MIN_PASSWORD;

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (!ready) {
          return;
        }
        const ok = await run(() => changePasswordAction(currentPassword, newPassword), t("passwordUpdated"));
        if (ok) {
          setCurrentPassword("");
          setNewPassword("");
        }
      }}
    >
      <SectionCard
        id="password"
        title={t("passwordTitle")}
        description={t("passwordDescription")}
        footer={
          <Button type="submit" variant="primary" loading={pending} disabled={!ready}>
            {t("savePassword")}
          </Button>
        }
      >
        <SettingsRow
          label={t("currentPassword")}
          description={t("currentPasswordDesc")}
          info={t("currentPasswordInfo")}
          htmlFor="current-password"
        >
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </SettingsRow>
        <SettingsRow
          label={t("newPassword")}
          description={t("newPasswordDesc", { count: MIN_PASSWORD })}
          info={t("newPasswordInfo")}
          htmlFor="new-password"
        >
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            minLength={MIN_PASSWORD}
            aria-invalid={tooShort || undefined}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          {tooShort ? (
            <span className="text-[13px] text-warn-ink">
              {t("newPasswordTooShort", { count: MIN_PASSWORD - newPassword.length })}
            </span>
          ) : null}
        </SettingsRow>
      </SectionCard>
    </form>
  );
}

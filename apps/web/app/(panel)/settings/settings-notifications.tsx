"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Callout, SectionCard, SettingsRow, Switch } from "@/components/ui";
import { saveWorkspaceSettingsAction } from "./defaults-actions";
import { useSettingsAction } from "./settings-dialogs";

type SettingsNotificationsProps = {
  healthAlerts: boolean;
  weeklyDigest: boolean;
  canManage: boolean;
  /** Owners and admins who will actually get the emails. */
  recipientCount: number;
};

/**
 * Each switch saves on its own: there is nothing to combine, and a toggle that needs a
 * separate Save button is easy to leave half-done.
 */
export function SettingsNotifications({
  healthAlerts,
  weeklyDigest,
  canManage,
  recipientCount,
}: SettingsNotificationsProps) {
  const t = useTranslations("settings");
  const { pending, run } = useSettingsAction();
  const [alerts, setAlerts] = useState(healthAlerts);
  const [digest, setDigest] = useState(weeklyDigest);

  async function toggle(
    key: "healthAlerts" | "weeklyDigest",
    next: boolean,
    setLocal: (value: boolean) => void,
  ): Promise<void> {
    setLocal(next);
    const ok = await run(
      () => saveWorkspaceSettingsAction({ [key]: next }),
      next ? t("notificationOn") : t("notificationOff"),
    );
    if (!ok) {
      setLocal(!next);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {canManage ? null : <Callout tone="info">{t("notificationsLocked")}</Callout>}

      <SectionCard
        id="notifications"
        title={t("notificationsTitle")}
        description={t("notificationsDescription", { count: recipientCount })}
      >
        <SettingsRow
          label={t("healthAlerts")}
          description={t("healthAlertsDesc")}
          info={t("healthAlertsInfo")}
        >
          <Switch
            checked={alerts}
            disabled={!canManage || pending}
            aria-label={t("healthAlerts")}
            onCheckedChange={(checked) => void toggle("healthAlerts", checked, setAlerts)}
          />
        </SettingsRow>
        <SettingsRow
          label={t("weeklyDigest")}
          description={t("weeklyDigestDesc")}
          info={t("weeklyDigestInfo")}
        >
          <Switch
            checked={digest}
            disabled={!canManage || pending}
            aria-label={t("weeklyDigest")}
            onCheckedChange={(checked) => void toggle("weeklyDigest", checked, setDigest)}
          />
        </SettingsRow>
      </SectionCard>
    </div>
  );
}

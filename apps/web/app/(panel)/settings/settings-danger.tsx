"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Section } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { deleteTeamAction, scheduleAccountDeletionAction } from "./actions";
import { SettingsCard } from "./settings-card";
import { DangerButton } from "./settings-dialogs";
import type { RequestConfirm, RunAction } from "./settings-types";

type SettingsDangerProps = {
  workspace: { name: string; kind: "personal" | "team" };
  isOwner: boolean;
  pending: boolean;
  run: RunAction;
  requestConfirm: RequestConfirm;
};

export function SettingsDanger({
  workspace,
  isOwner,
  pending,
  run,
  requestConfirm,
}: SettingsDangerProps) {
  const router = useRouter();
  const t = useTranslations("settings");
  const isTeam = workspace.kind === "team";

  return (
    <Section title={t("dangerousTitle")} description={t("dangerousDescription")}>
      <div className="flex min-w-0 flex-col gap-8">
        {isTeam && isOwner ? (
          <SettingsCard
            danger
            title={t("deleteTeam")}
            description={t("deleteTeamBody")}
            footer={
              <DangerButton
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
            }
          />
        ) : null}

        <SettingsCard
          danger
          title={t("deleteAccount")}
          description={t("deleteAccountBody")}
          footer={
            <DangerButton
              disabled={pending}
              onClick={() =>
                requestConfirm({
                  title: t("deleteAccountTitle"),
                  description: t("deleteAccountConfirm"),
                  consequences: [
                    t("deleteAccountLogout"),
                    t("deleteAccountGrace"),
                    t("deleteAccountIrreversible"),
                  ],
                  confirmLabel: t("deleteAccount"),
                  requirePassword: true,
                  onConfirm: (password) =>
                    run(async () => {
                      const result = await scheduleAccountDeletionAction(password ?? "");
                      if (result.ok) {
                        try {
                          await authClient.signOut();
                        } catch {
                          // Session rows are already gone; still leave the panel.
                        }
                        router.push("/login?notice=deletion-scheduled");
                      }
                      return result;
                    }),
                })
              }
            >
              {t("deleteAccount")}
            </DangerButton>
          }
        />
      </div>
    </Section>
  );
}

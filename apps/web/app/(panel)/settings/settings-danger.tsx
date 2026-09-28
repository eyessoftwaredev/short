"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, SectionCard, SettingsRow } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { deleteTeamAction, scheduleAccountDeletionAction } from "./actions";
import { useSettingsAction, useSettingsConfirm } from "./settings-dialogs";
import type { WorkspaceView } from "./settings-types";

type SettingsDangerProps = {
  workspace: WorkspaceView;
  isOwner: boolean;
};

export function SettingsDanger({ workspace, isOwner }: SettingsDangerProps) {
  const router = useRouter();
  const t = useTranslations("settings");
  const { pending, run } = useSettingsAction();
  const { requestConfirm, dialog } = useSettingsConfirm();
  const isTeam = workspace.kind === "team";

  return (
    <>
      <SectionCard
        tone="danger"
        id="danger"
        title={t("dangerousTitle")}
        description={t("dangerousDescription")}
      >
        {isTeam ? (
          <SettingsRow
            label={t("deleteTeam")}
            description={isOwner ? t("deleteTeamBody") : t("deleteTeamOwnerOnly")}
          >
            <Button
              variant="danger"
              leadingIcon="trash"
              className="self-start md:self-end"
              disabled={!isOwner || pending}
              onClick={() =>
                requestConfirm({
                  title: t("deleteTeamTitle", { name: workspace.name }),
                  description: t("deleteTeamConfirm"),
                  consequences: [t("deleteTeamLinks"), t("deleteTeamKeepAccount")],
                  confirmLabel: t("deleteTeam"),
                  onConfirm: async () => {
                    const ok = await run(
                      async () => {
                        const result = await deleteTeamAction();
                        if (result.ok) {
                          router.push("/dashboard");
                        }
                        return result;
                      },
                      t("teamDeleted", { name: workspace.name }),
                    );
                    return ok;
                  },
                })
              }
            >
              {t("deleteTeam")}
            </Button>
          </SettingsRow>
        ) : null}

        <SettingsRow label={t("deleteAccount")} description={t("deleteAccountBody")}>
          <Button
            variant="danger"
            leadingIcon="trash"
            className="self-start md:self-end"
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
          </Button>
        </SettingsRow>
      </SectionCard>
      {dialog}
    </>
  );
}

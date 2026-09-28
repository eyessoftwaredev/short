"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { usePanelSession } from "@/components/providers/session-provider";
import { Button, Callout } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

/**
 * Always visible while a superadmin is viewing the panel as someone else, so an action
 * is never taken on a customer's account by accident.
 */
export function ImpersonationBanner() {
  const session = usePanelSession();
  const t = useTranslations("panel");
  const [pending, startTransition] = useTransition();

  if (!session.impersonatedBy) {
    return null;
  }

  function stop(): void {
    startTransition(async () => {
      try {
        const result = await authClient.admin.stopImpersonating();
        if (result.error) {
          // The admin session is gone (expired or revoked): drop the support session
          // rather than leave the operator stuck inside the customer's account.
          console.error("failed to stop impersonating", result.error);
          await authClient.signOut();
          window.location.assign("/login");
          return;
        }
        // Full navigation so the restored admin cookie is the one the next request sends.
        window.location.assign("/admin/users");
      } catch (error) {
        console.error("failed to stop impersonating", error);
      }
    });
  }

  return (
    <Callout
      tone="warn"
      icon="user-gear"
      title={t("viewingAs", { email: session.user.email, workspace: session.workspace.name })}
      actions={
        <Button size="sm" loading={pending} onClick={stop}>
          {t("endSession")}
        </Button>
      }
    />
  );
}

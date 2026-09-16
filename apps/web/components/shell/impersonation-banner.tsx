"use client";

import { Icon } from "@/components/kit/icon";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { usePanelSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

/**
 * Always visible while a superadmin is viewing the panel as someone else, so an action
 * is never taken on a customer's account by accident.
 */
export function ImpersonationBanner() {
  const session = usePanelSession();
  const t = useTranslations("panel");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!session.impersonatedBy) {
    return null;
  }

  function stop(): void {
    startTransition(async () => {
      try {
        await authClient.admin.stopImpersonating();
        router.push("/admin/users");
        router.refresh();
      } catch (error) {
        console.error("failed to stop impersonating", error);
      }
    });
  }

  return (
    <div
      role="status"
      className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-default border border-warn-border bg-warn-surface px-4 py-2.5 text-warn-ink"
    >
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <Icon name="user-gear" className="text-sm shrink-0" />
        <span className="min-w-0 truncate">
          {t("viewingAs", { email: session.user.email, workspace: session.workspace.name })}
        </span>
      </span>
      <Button size="sm" disabled={pending} onClick={stop}>
        {t("endSession")}
      </Button>
    </div>
  );
}

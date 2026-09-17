"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/kit/icon";
import { usePanelSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui";

export function AccountRestoredBanner() {
  const session = usePanelSession();
  const t = useTranslations("panel");
  const tc = useTranslations("common");
  const [dismissed, setDismissed] = useState(false);

  if (!session.accountRestored || dismissed) {
    return null;
  }

  return (
    <div
      role="status"
      className="flex min-w-0 items-start gap-3 rounded-default border border-border-strong bg-surface-subtle px-4 py-3"
    >
      <Icon name="circle-info" className="mt-0.5 shrink-0 text-sm text-fg-muted" />
      <p className="m-0 min-w-0 flex-1 text-sm text-fg-muted">{t("accountRestored")}</p>
      <Button variant="ghost" size="sm" aria-label={tc("dismiss")} onClick={() => setDismissed(true)}>
        {tc("dismiss")}
      </Button>
    </div>
  );
}

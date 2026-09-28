"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePanelSession } from "@/components/providers/session-provider";
import { Callout } from "@/components/ui";

export function AccountRestoredBanner() {
  const session = usePanelSession();
  const t = useTranslations("panel");
  const [dismissed, setDismissed] = useState(false);

  if (!session.accountRestored || dismissed) {
    return null;
  }

  return (
    <Callout tone="success" onDismiss={() => setDismissed(true)}>
      {t("accountRestored")}
    </Callout>
  );
}

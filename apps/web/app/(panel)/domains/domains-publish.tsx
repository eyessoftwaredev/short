"use client";

import { Icon } from "@/components/kit/icon";
import { useActionMessage } from "@/lib/action-message";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import { resyncKvAction } from "./actions";
import { domainActionError } from "./errors";

export function DomainsPublish() {
  const t = useTranslations("domains");
  const te = useTranslations("errors");
  const actionMessage = useActionMessage();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  async function resync(): Promise<void> {
    setNotice(null);
    const result = await resyncKvAction();
    setNotice(
      result.ok
        ? t("publishedCount", { count: result.data.count })
        : domainActionError(result.error, result.fieldErrors, "", t, te, actionMessage),
    );
  }

  return (
    <Card staticHover className="flex-row flex-wrap items-center justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{t("publishTitle")}</span>
        <span className="block text-sm text-fg-muted">{notice ?? t("publishHint")}</span>
      </span>
      <Button disabled={pending} onClick={() => startTransition(() => void resync())}>
        <Icon name="rotate-right" className="text-base" />
        {t("resync")}
      </Button>
    </Card>
  );
}

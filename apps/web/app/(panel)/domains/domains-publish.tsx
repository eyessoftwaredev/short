"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button, Disclosure, toast } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { resyncKvAction } from "./actions";
import { domainActionError } from "./errors";

/**
 * Manual escape hatch for when the edge and the database drift apart. Rarely
 * needed, so it sits collapsed at the bottom of the list.
 */
export function DomainsPublish() {
  const t = useTranslations("domains");
  const te = useTranslations("errors");
  const actionMessage = useActionMessage();
  const [pending, startTransition] = useTransition();

  function resync(): void {
    startTransition(async () => {
      const result = await resyncKvAction();
      if (result.ok) {
        toast.success(t("publishedCount", { count: result.data.count }));
        return;
      }
      toast.error(domainActionError(result.error, result.fieldErrors, "", t, te, actionMessage));
    });
  }

  return (
    <Disclosure title={t("troubleshootTitle")} description={t("troubleshootDesc")}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
        <span className="flex min-w-0 flex-1 basis-64 flex-col gap-0.5">
          <span className="text-sm font-medium text-ink">{t("publishTitle")}</span>
          <span className="text-[13px] text-fg-muted">{t("publishHint")}</span>
        </span>
        <Button leadingIcon="rotate-right" loading={pending} onClick={resync}>
          {t("resync")}
        </Button>
      </div>
    </Disclosure>
  );
}

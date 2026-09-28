"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Callout } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { openQrCodeForLinkAction } from "./actions";

type LinkQrButtonProps = {
  linkId: string;
};

/**
 * One-click "Create QR code" for a link. Creates the code with the designer's default
 * style (through the regular quota, plan and audit path) and opens it in the designer.
 */
export function LinkQrButton({ linkId }: LinkQrButtonProps) {
  const t = useTranslations("qr");
  const actionMessage = useActionMessage();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<{ message: string; quota: boolean } | null>(null);

  function create(): void {
    setError(null);
    startTransition(async () => {
      try {
        const result = await openQrCodeForLinkAction(linkId);
        if (!result.ok) {
          setError({ message: actionMessage(result.error), quota: result.error === "quota" });
          return;
        }
        router.push(`/qr/${result.data.id}`);
      } catch (cause) {
        console.error("failed to create QR code for link", cause);
        setError({ message: actionMessage("generic"), quota: false });
      }
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Button size="sm" leadingIcon="qrcode" loading={pending} onClick={create}>
          {pending ? t("linkCard.creating") : t("createCode")}
        </Button>
        <Button size="sm" variant="ghost" href={`/qr/new?linkId=${linkId}`}>
          {t("linkCard.designCustom")}
        </Button>
      </div>
      {error ? (
        <Callout
          tone="danger"
          title={error.message}
          actions={
            error.quota ? (
              <Button size="sm" leadingIcon="rocket" href="/billing">
                {t("linkCard.upgrade")}
              </Button>
            ) : null
          }
        />
      ) : null}
    </div>
  );
}

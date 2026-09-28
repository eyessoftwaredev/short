"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button, toast } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { openQrCodeForLinkAction } from "../qr/actions";

/** Opens the link's newest QR code in the designer, creating one first when there is none. */
export function OpenQrButton({ linkId }: { linkId: string }) {
  const tq = useTranslations("qr");
  const tc = useTranslations("common");
  const router = useRouter();
  const actionMessage = useActionMessage();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      leadingIcon="qrcode"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            const result = await openQrCodeForLinkAction(linkId);
            if (!result.ok) {
              toast({
                tone: "error",
                title: actionMessage(result.error),
                action:
                  result.error === "quota" ? { label: tc("upgrade"), onClick: () => router.push("/billing") } : undefined,
              });
              return;
            }
            router.push(`/qr/${result.data.id}`);
          } catch {
            toast.error(actionMessage("generic"));
          }
        })
      }
    >
      {tq("linkCard.menuItem")}
    </Button>
  );
}

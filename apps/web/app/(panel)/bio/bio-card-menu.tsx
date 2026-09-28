"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/kit/icon";
import { Button, ConfirmDialog, Dropdown, toast } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { deleteBiopageAction } from "./actions";

type BioCardMenuProps = {
  id: string;
  name: string;
  url: string;
  live: boolean;
};

/** The "…" menu on a bio page card: open the live page, or delete it (with a confirm). */
export function BioCardMenu({ id, name, url, live }: BioCardMenuProps) {
  const t = useTranslations("bio");
  const router = useRouter();
  const actionMessage = useActionMessage();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  async function remove(): Promise<void> {
    setPending(true);
    const result = await deleteBiopageAction(id);
    setPending(false);
    if (!result.ok) {
      toast.error(actionMessage(result.error));
      return;
    }
    setConfirming(false);
    toast.success(t("list.deleted", { name }));
    router.refresh();
  }

  return (
    <>
      <Dropdown
        align="end"
        label={t("list.moreActions")}
        trigger={
          <Button size="sm" variant="ghost" icon aria-label={t("list.moreActions")}>
            <Icon name="ellipsis" className="text-sm" />
          </Button>
        }
        items={[
          {
            id: "open",
            label: t("openPage"),
            description: live ? undefined : t("list.openDisabled"),
            icon: <Icon name="external-link" className="text-xs" />,
            href: url,
            external: true,
            disabled: !live,
          },
          {
            id: "delete",
            label: t("deletePage"),
            icon: <Icon name="trash" className="text-xs" />,
            danger: true,
            separated: true,
            onSelect: () => setConfirming(true),
          },
        ]}
      />
      <ConfirmDialog
        open={confirming}
        title={t("deleteDialogTitle", { name })}
        description={t("deleteDialogBody")}
        confirmLabel={t("deletePage")}
        loading={pending}
        onConfirm={() => {
          void remove();
        }}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}

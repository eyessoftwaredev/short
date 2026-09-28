"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, ConfirmDialog, Field, Input, SectionCard, SettingsRow, toast } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { removeDomainAction } from "./actions";
import { domainActionError } from "./errors";
import type { DomainRowView } from "./types";

/**
 * Removal deletes every short link on the domain, so a domain that carries links
 * asks for the hostname to be typed before the button unlocks.
 */
export function DomainDangerZone({ domain }: { domain: DomainRowView }) {
  const t = useTranslations("domains");
  const te = useTranslations("errors");
  const actionMessage = useActionMessage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const needsTyping = domain.linkCount > 0;

  function close(): void {
    setOpen(false);
    setTyped("");
  }

  function remove(): void {
    startTransition(async () => {
      const result = await removeDomainAction(domain.id);
      if (!result.ok) {
        close();
        toast.error(
          t("removeFailed"),
          domainActionError(result.error, result.fieldErrors, domain.hostname, t, te, actionMessage),
        );
        return;
      }
      toast.success(t("removed", { host: domain.hostname }));
      router.push("/domains");
      router.refresh();
    });
  }

  return (
    <>
      <SectionCard tone="danger" title={t("dangerTitle")} description={t("dangerDesc")}>
        <SettingsRow label={t("removeLabel")} description={t("removeDesc", { host: domain.hostname })}>
          <div className="flex md:justify-end">
            <Button variant="danger" leadingIcon="trash" onClick={() => setOpen(true)}>
              {t("removeAction")}
            </Button>
          </div>
        </SettingsRow>
      </SectionCard>

      <ConfirmDialog
        open={open}
        title={t("removeTitle", { host: domain.hostname })}
        description={t("removeBody", { count: domain.linkCount })}
        confirmLabel={t("removeAction")}
        loading={pending}
        confirmDisabled={needsTyping && typed.trim().toLowerCase() !== domain.hostname}
        onConfirm={remove}
        onClose={close}
      >
        {needsTyping ? (
          <Field label={t("typeToConfirm", { host: domain.hostname })}>
            <Input
              value={typed}
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              placeholder={domain.hostname}
              onChange={(event) => setTyped(event.target.value)}
            />
          </Field>
        ) : null}
      </ConfirmDialog>
    </>
  );
}

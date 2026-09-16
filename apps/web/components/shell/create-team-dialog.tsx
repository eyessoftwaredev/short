"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button, Field, Input, Modal } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { createTeamAction } from "@/app/(panel)/settings/actions";

export function CreateTeamDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (workspaceId: string) => void;
}) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const actionMessage = useActionMessage();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close(): void {
    if (pending) {
      return;
    }
    setError(null);
    setName("");
    onClose();
  }

  function submit(): void {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createTeamAction(name);
        if (!result.ok) {
          setError(actionMessage(result.error));
          return;
        }
        setName("");
        onClose();
        onCreated(result.data.workspaceId);
      } catch (caught) {
        console.error("failed to create team", caught);
        setError(actionMessage("generic"));
      }
    });
  }

  return (
    <Modal
      open={open}
      title={t("createTeam")}
      description={t("createTeamDescription")}
      onClose={close}
      footer={
        <>
          <Button variant="ghost" disabled={pending} onClick={close}>
            {tc("cancel")}
          </Button>
          <Button variant="primary" disabled={pending || name.trim().length < 2} onClick={submit}>
            {t("createTeam")}
          </Button>
        </>
      }
    >
      <Field label={t("teamName")}>
        <Input
          value={name}
          minLength={2}
          maxLength={80}
          autoComplete="off"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
        />
      </Field>
      {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}
    </Modal>
  );
}

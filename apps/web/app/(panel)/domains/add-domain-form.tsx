"use client";

import { Icon } from "@/components/kit/icon";
import { useActionMessage } from "@/lib/action-message";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button, Field, Input } from "@/components/ui";
import { addDomainAction } from "./actions";
import { domainActionError } from "./errors";

type AddDomainFormProps = {
  cloudflareConfigured: boolean;
};

export function AddDomainForm({ cloudflareConfigured }: AddDomainFormProps) {
  const t = useTranslations("domains");
  const te = useTranslations("errors");
  const actionMessage = useActionMessage();
  const router = useRouter();
  const [hostname, setHostname] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const host = hostname.trim();
    setError(null);
    start(async () => {
      const result = await addDomainAction(host);
      if (result.ok) {
        router.push(`/domains/${result.data.id}`);
        return;
      }
      setError(domainActionError(result.error, result.fieldErrors, host, t, te, actionMessage));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label={t("hostname")} error={error ?? undefined}>
        <Input
          name="hostname"
          placeholder={t("placeholder")}
          autoComplete="off"
          value={hostname}
          onChange={(event) => setHostname(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
        />
      </Field>
      <Button type="button" variant="primary" className="self-start" onClick={submit} disabled={pending}>
        <Icon name="plus" className="text-sm" />
        {pending ? t("adding") : t("add")}
      </Button>
      {!cloudflareConfigured ? (
        <p className="text-xs text-fg-muted">{t("cloudflareMissing")}</p>
      ) : null}
    </div>
  );
}

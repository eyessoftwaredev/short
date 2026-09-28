"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { Button, Card, Field, Input, toast } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { addDomainAction } from "./actions";
import { cleanHostnameInput, isApexHostname } from "./dns-names";
import { domainActionError } from "./errors";

export function AddDomainForm() {
  const t = useTranslations("domains");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const actionMessage = useActionMessage();
  const router = useRouter();
  const [hostname, setHostname] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const cleaned = cleanHostnameInput(hostname);
  const wasCleaned = cleaned !== "" && cleaned !== hostname.trim();
  // A root domain works, but most providers need a special record for it — say so early.
  const apex = cleaned.includes(".") && isApexHostname(cleaned);

  let hint = t("domainHint");
  if (apex) {
    hint = t("apexTip", { host: cleaned });
  } else if (wasCleaned) {
    hint = t("cleanedHost", { host: cleaned });
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (cleaned === "") {
      setError(t("errorEmpty"));
      return;
    }
    setError(null);
    start(async () => {
      const result = await addDomainAction(cleaned);
      if (result.ok) {
        toast.success(t("added", { host: result.data.hostname }));
        router.push(`/domains/${result.data.id}`);
        return;
      }
      setError(domainActionError(result.error, result.fieldErrors, cleaned, t, te, actionMessage));
    });
  }

  return (
    <form onSubmit={submit} noValidate className="min-w-0">
      <Card
        title={t("enterCardTitle")}
        description={t("enterCardDesc")}
        footer={
          <div className="flex w-full flex-wrap justify-end gap-2">
            <Button href="/domains">{tc("cancel")}</Button>
            <Button type="submit" variant="primary" loading={pending} trailingIcon="arrow-right">
              {t("addAndContinue")}
            </Button>
          </div>
        }
      >
        <Field label={t("domain")} info={t("hostnameInfo")} hint={hint} error={error ?? undefined} required>
          <Input
            name="hostname"
            placeholder={t("placeholder")}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="url"
            prefix="https://"
            wrapperClassName="font-mono"
            value={hostname}
            aria-invalid={error ? true : undefined}
            autoFocus
            onChange={(event) => {
              setHostname(event.target.value);
              if (error) {
                setError(null);
              }
            }}
          />
        </Field>
      </Card>
    </form>
  );
}

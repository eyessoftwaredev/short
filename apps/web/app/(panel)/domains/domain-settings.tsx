"use client";

import { Icon } from "@/components/kit/icon";
import { useActionMessage } from "@/lib/action-message";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card, Field, Input, Switch } from "@/components/ui";
import { refreshDomainAction, removeDomainAction, updateDomainAction } from "./actions";
import { domainActionError } from "./errors";
import type { DomainRowView } from "./types";

type DomainSettingsProps = {
  domain: DomainRowView;
  canManage: boolean;
};

export function DomainSettings({ domain, canManage }: DomainSettingsProps) {
  const t = useTranslations("domains");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const actionMessage = useActionMessage();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [root, setRoot] = useState(domain.rootDestination ?? "");
  const [notFound, setNotFound] = useState(domain.notFoundDestination ?? "");
  const [isDefault, setIsDefault] = useState(domain.isDefault);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const readOnly = !canManage || domain.isPlatform;

  async function save(): Promise<void> {
    setError(null);
    setNotice(null);
    const result = await updateDomainAction(domain.id, {
      rootDestination: root,
      notFoundDestination: notFound,
      isDefault,
    });
    if (!result.ok) {
      setError(domainActionError(result.error, result.fieldErrors, domain.hostname, t, te, actionMessage));
      return;
    }
    setNotice(t("saved"));
    router.refresh();
  }

  async function recheck(): Promise<void> {
    setError(null);
    const result = await refreshDomainAction(domain.id);
    if (!result.ok) {
      setError(domainActionError(result.error, result.fieldErrors, domain.hostname, t, te, actionMessage));
      return;
    }
    router.refresh();
  }

  async function remove(): Promise<void> {
    if (!window.confirm(t("removeConfirm", { host: domain.hostname }))) {
      return;
    }
    const result = await removeDomainAction(domain.id);
    if (!result.ok) {
      setError(domainActionError(result.error, result.fieldErrors, domain.hostname, t, te, actionMessage));
      return;
    }
    router.push("/domains");
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Field label={t("rootDestination")} hint={t("rootHint")}>
        <Input
          placeholder="https://acme.com"
          value={root}
          disabled={readOnly}
          onChange={(event) => setRoot(event.target.value)}
        />
      </Field>

      <Field label={t("notFoundDestination")} hint={t("notFoundHint")}>
        <Input
          placeholder="https://acme.com/404"
          value={notFound}
          disabled={readOnly}
          onChange={(event) => setNotFound(event.target.value)}
        />
      </Field>

      <Card staticHover className="flex-row items-center justify-between gap-4">
        <span className="min-w-0">
          <span className="block text-sm font-medium">{t("defaultForNew")}</span>
          <span className="block text-sm text-fg-muted">{t("defaultForNewHint")}</span>
        </span>
        <Switch checked={isDefault} disabled={readOnly} onCheckedChange={setIsDefault} />
      </Card>

      {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}
      {notice ? <p className="m-0 text-sm text-accent-ink">{notice}</p> : null}

      <div className="flex min-w-0 flex-wrap gap-2">
        {readOnly ? null : (
          <Button variant="primary" disabled={pending} onClick={() => startTransition(() => void save())}>
            {pending ? t("saving") : tc("save")}
          </Button>
        )}
        {canManage && !domain.isPlatform ? (
          <>
            <Button disabled={pending} onClick={() => startTransition(() => void recheck())}>
              <Icon name="rotate-right" className="text-base" />
              {t("recheck")}
            </Button>
            <Button variant="danger" disabled={pending} onClick={() => startTransition(() => void remove())}>
              <Icon name="trash" className="text-base" />
              {t("remove")}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

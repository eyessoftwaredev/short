"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Field, Input, SectionCard, SettingsRow, Switch, toast } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { updateDomainAction } from "./actions";
import { withScheme } from "./dns-names";
import { domainActionError } from "./errors";
import type { DomainRowView } from "./types";

type DomainSettingsProps = {
  domain: DomainRowView;
  canManage: boolean;
};

type FieldErrors = { root?: string; notFound?: string };

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
  const [errors, setErrors] = useState<FieldErrors>({});
  const readOnly = !canManage || domain.isPlatform;

  const dirty =
    root !== (domain.rootDestination ?? "") ||
    notFound !== (domain.notFoundDestination ?? "") ||
    isDefault !== domain.isDefault;

  function reset(): void {
    setRoot(domain.rootDestination ?? "");
    setNotFound(domain.notFoundDestination ?? "");
    setIsDefault(domain.isDefault);
    setErrors({});
  }

  function save(): void {
    setErrors({});
    startTransition(async () => {
      const result = await updateDomainAction(domain.id, {
        rootDestination: root,
        notFoundDestination: notFound,
        isDefault,
      });
      if (!result.ok) {
        if (result.error === "validation" && result.fieldErrors) {
          setErrors({
            root: result.fieldErrors.rootDestination ? t("urlInvalid") : undefined,
            notFound: result.fieldErrors.notFoundDestination ? t("urlInvalid") : undefined,
          });
          return;
        }
        toast.error(domainActionError(result.error, result.fieldErrors, domain.hostname, t, te, actionMessage));
        return;
      }
      // Mirror the server's `https://` completion so the form is not left "dirty".
      setRoot(withScheme(root));
      setNotFound(withScheme(notFound));
      toast.success(t("settingsSaved"));
      router.refresh();
    });
  }

  return (
    <SectionCard
      id="domain-settings"
      title={t("settingsTitle")}
      description={t("settingsDesc")}
      footer={
        readOnly ? (
          <span className="mr-auto text-[13px] text-fg-subtle">{t("settingsReadOnly")}</span>
        ) : (
          <>
            <Button variant="ghost" onClick={reset} disabled={!dirty || pending}>
              {tc("discard")}
            </Button>
            <Button variant="primary" onClick={save} loading={pending} disabled={!dirty}>
              {tc("save")}
            </Button>
          </>
        )
      }
    >
      <SettingsRow
        label={t("rootLabel")}
        description={t("rootDesc", { host: domain.hostname })}
        info={t("rootDestinationInfo")}
        htmlFor="domain-root"
      >
        <Field error={errors.root}>
          <Input
            id="domain-root"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder={t("urlPlaceholder")}
            value={root}
            disabled={readOnly}
            aria-invalid={errors.root ? true : undefined}
            onChange={(event) => setRoot(event.target.value)}
          />
        </Field>
      </SettingsRow>

      <SettingsRow
        label={t("notFoundLabel")}
        description={t("notFoundDesc")}
        info={t("notFoundDestinationInfo")}
        htmlFor="domain-not-found"
      >
        <Field error={errors.notFound}>
          <Input
            id="domain-not-found"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder={t("urlPlaceholder")}
            value={notFound}
            disabled={readOnly}
            aria-invalid={errors.notFound ? true : undefined}
            onChange={(event) => setNotFound(event.target.value)}
          />
        </Field>
      </SettingsRow>

      <SettingsRow label={t("defaultLabel")} description={t("defaultDesc")} info={t("defaultForNewInfo")}>
        <div className="flex md:justify-end">
          <Switch
            checked={isDefault}
            disabled={readOnly}
            onCheckedChange={setIsDefault}
            aria-label={t("defaultLabel")}
          />
        </div>
      </SettingsRow>
    </SectionCard>
  );
}

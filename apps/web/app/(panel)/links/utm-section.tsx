"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";
import { applyUtm, normalizeDestination, type UtmParams } from "@short/core";
import { Button, CopyField, Field, InfoTip, Input, Modal, Select, Switch, toast } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import type { UtmTemplateView } from "@/lib/utm-templates";
import {
  createUtmTemplateAction,
  listUtmTemplatesAction,
  updateUtmTemplateAction,
} from "./utm-template-actions";

export type UtmValues = {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
};

const FIELDS = [
  { key: "utmSource", param: "utm_source", placeholder: "utmSourcePlaceholder" },
  { key: "utmMedium", param: "utm_medium", placeholder: "utmMediumPlaceholder" },
  { key: "utmCampaign", param: "utm_campaign", placeholder: "utmCampaignPlaceholder" },
  { key: "utmTerm", param: "utm_term", placeholder: null },
  { key: "utmContent", param: "utm_content", placeholder: null },
] as const;

export function toUtmParams(values: UtmValues): UtmParams {
  const out: UtmParams = {};
  for (const field of FIELDS) {
    const value = values[field.key].trim();
    if (value !== "") {
      out[field.param] = value;
    }
  }
  return out;
}

function fromUtmParams(utm: UtmParams): UtmValues {
  return {
    utmSource: utm.utm_source ?? "",
    utmMedium: utm.utm_medium ?? "",
    utmCampaign: utm.utm_campaign ?? "",
    utmTerm: utm.utm_term ?? "",
    utmContent: utm.utm_content ?? "",
  };
}

function sameUtm(a: UtmParams, b: UtmParams): boolean {
  return FIELDS.every((field) => (a[field.param] ?? "") === (b[field.param] ?? ""));
}

type UtmSectionProps = {
  values: UtmValues;
  onChange: (next: UtmValues) => void;
  destination: string;
  forwardQuery: boolean;
  onForwardQueryChange: (next: boolean) => void;
  /** Field errors from the form, keyed like `values`. */
  errors?: Partial<Record<keyof UtmValues, string>>;
};

/**
 * Campaign tags with the workspace's saved UTM templates: pick one to fill every field,
 * save the current set as a new template, or update the one that was applied.
 */
export function UtmSection({
  values,
  onChange,
  destination,
  forwardQuery,
  onForwardQueryChange,
  errors = {},
}: UtmSectionProps) {
  const t = useTranslations("links");
  const tc = useTranslations("common");
  const actionMessage = useActionMessage();
  const [templates, setTemplates] = useState<UtmTemplateView[] | null>(null);
  const [appliedId, setAppliedId] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    listUtmTemplatesAction()
      .then((result) => {
        if (!cancelled) {
          setTemplates(result.ok ? result.data : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTemplates([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const current = useMemo(() => toUtmParams(values), [values]);
  const hasValues = Object.keys(current).length > 0;
  const applied = templates?.find((template) => template.id === appliedId) ?? null;
  const appliedChanged = applied != null && !sameUtm(applied.utm, current);

  const finalUrl = useMemo(() => {
    const base = normalizeDestination(destination);
    if (base === "" || !hasValues) {
      return null;
    }
    try {
      new URL(base);
    } catch {
      return null;
    }
    return applyUtm(base, current);
  }, [current, destination, hasValues]);

  function applyTemplate(id: string): void {
    setAppliedId(id);
    const template = templates?.find((item) => item.id === id);
    if (!template) {
      return;
    }
    onChange(fromUtmParams(template.utm));
    toast.success(t("form.utmApplied", { name: template.name }));
  }

  function saveTemplate(): void {
    const trimmed = name.trim();
    if (trimmed === "") {
      return;
    }
    setSaveError(null);
    startTransition(async () => {
      const result = await createUtmTemplateAction({ name: trimmed, utm: current });
      if (!result.ok) {
        setSaveError(
          result.error === "validation" && result.fieldErrors?.utm ? t("form.utmEmpty") : actionMessage(result.error),
        );
        return;
      }
      setTemplates((prev) =>
        [...(prev ?? []), result.data].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setAppliedId(result.data.id);
      setSaveOpen(false);
      setName("");
      toast.success(t("form.utmSaved", { name: result.data.name }));
    });
  }

  function updateTemplate(): void {
    if (!applied) {
      return;
    }
    startTransition(async () => {
      const result = await updateUtmTemplateAction(applied.id, { utm: current });
      if (!result.ok) {
        toast.error(actionMessage(result.error));
        return;
      }
      setTemplates((prev) => (prev ?? []).map((item) => (item.id === result.data.id ? result.data : item)));
      toast.success(t("form.utmUpdated", { name: result.data.name }));
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex min-w-0 flex-wrap items-end gap-2">
        <Field
          label={t("form.utmTemplate")}
          info={t("form.utmTemplateInfo")}
          hint={templates && templates.length === 0 ? t("form.utmNoTemplates") : undefined}
          className="min-w-52 flex-1"
        >
          <Select
            value={appliedId}
            disabled={!templates || templates.length === 0}
            onChange={(event) => applyTemplate(event.target.value)}
          >
            <option value="">{templates === null ? tc("loading") : t("form.utmPickTemplate")}</option>
            {(templates ?? []).map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </Select>
        </Field>
        {appliedChanged ? (
          <Button leadingIcon="rotate-right" loading={pending} onClick={updateTemplate}>
            {t("form.utmUpdate", { name: applied.name })}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          leadingIcon="plus"
          disabled={!hasValues}
          title={hasValues ? undefined : t("form.utmEmpty")}
          onClick={() => {
            setSaveError(null);
            setSaveOpen(true);
          }}
        >
          {t("form.utmSaveAs")}
        </Button>
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <Field
            key={field.key}
            label={
              <span className="flex items-baseline gap-1.5">
                {t(`form.${field.key}Label`)}
                <code className="font-mono text-[11px] font-normal text-fg-subtle">{field.param}</code>
              </span>
            }
            info={t(`info.${field.key}`)}
            error={errors[field.key]}
          >
            <Input
              value={values[field.key]}
              placeholder={field.placeholder ? t(field.placeholder) : undefined}
              maxLength={255}
              autoComplete="off"
              onChange={(event) => onChange({ ...values, [field.key]: event.target.value })}
            />
          </Field>
        ))}
      </div>

      {finalUrl ? (
        <CopyField size="sm" label={t("form.utmFinalUrl")} info={t("form.utmFinalUrlInfo")} value={finalUrl} />
      ) : null}

      <div className="flex min-w-0 items-start justify-between gap-4 rounded-md border border-border-subtle bg-surface-subtle p-4">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
            {t("forwardQuery")}
            <InfoTip inline label={t("forwardQuery")}>
              {t("info.forwardQuery")}
            </InfoTip>
          </span>
          <span className="text-[13px] leading-5 text-fg-muted">{t("forwardQueryDesc")}</span>
        </span>
        <Switch
          checked={forwardQuery}
          aria-label={t("forwardQuery")}
          onCheckedChange={onForwardQueryChange}
        />
      </div>

      <Modal
        open={saveOpen}
        icon="bullseye"
        title={t("form.utmSaveTitle")}
        description={t("form.utmSaveDesc")}
        onClose={() => setSaveOpen(false)}
        footer={
          <>
            <Button onClick={() => setSaveOpen(false)} disabled={pending}>
              {tc("cancel")}
            </Button>
            <Button variant="primary" loading={pending} disabled={name.trim() === ""} onClick={saveTemplate}>
              {t("form.utmSaveConfirm")}
            </Button>
          </>
        }
      >
        <div className="flex min-w-0 flex-col gap-3">
          <Field label={t("form.utmTemplateName")} info={t("form.utmTemplateNameInfo")} error={saveError ?? undefined}>
            <Input
              value={name}
              maxLength={64}
              placeholder={t("form.utmTemplateNamePlaceholder")}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                // This dialog sits inside the link form; Enter must not submit that.
                if (event.key === "Enter") {
                  event.preventDefault();
                  saveTemplate();
                }
              }}
            />
          </Field>
          <ul className="m-0 flex list-none flex-col gap-1 rounded-md border border-border-subtle bg-surface-subtle p-3 font-mono text-xs text-fg-muted">
            {Object.entries(current).map(([key, value]) => (
              <li key={key} className="truncate">
                {key}={value}
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </div>
  );
}

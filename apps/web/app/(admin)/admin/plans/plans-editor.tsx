"use client";

import { Icon } from "@/components/kit/icon";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PlanFeatures, PlanKey, PlanLimits } from "@short/core";
import { formatLimit, isInternalPlan } from "@short/core";
import {
  Badge,
  Button,
  Field,
  Input,
  Select,
  Sheet,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { formatCurrency } from "@/lib/format";
import { updatePlanAction, type PlanUpdateInput } from "./actions";

export type PlanEditorRow = {
  key: PlanKey;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  currency: "USD" | "TRY" | "EUR";
  limits: PlanLimits;
  features: PlanFeatures;
  stripePriceMonthlyId: string | null;
  stripePriceYearlyId: string | null;
  visible: boolean;
  subscribers: number;
};

const LIMIT_FIELDS: Array<{
  key: keyof PlanLimits;
  labelKey:
    | "limitLinks"
    | "limitClicks"
    | "limitDomains"
    | "limitBio"
    | "limitQr"
    | "limitMembers"
    | "limitTeams"
    | "limitRetention"
    | "limitApi";
  hintKey?: "unlimitedHint";
}> = [
  { key: "links", labelKey: "limitLinks", hintKey: "unlimitedHint" },
  { key: "clicksPerMonth", labelKey: "limitClicks" },
  { key: "customDomains", labelKey: "limitDomains" },
  { key: "biopages", labelKey: "limitBio" },
  { key: "qrCodes", labelKey: "limitQr" },
  { key: "members", labelKey: "limitMembers" },
  { key: "teams", labelKey: "limitTeams" },
  { key: "retentionDays", labelKey: "limitRetention" },
  { key: "apiRequestsPerHour", labelKey: "limitApi" },
];

const FEATURE_FIELDS: Array<
  | {
      key: keyof PlanFeatures;
      source: "billing";
      labelKey:
        | "featureTargeting"
        | "featureAb"
        | "featurePassword"
        | "featureCloak"
        | "featureQrLogo"
        | "featureWebhooks"
        | "featureApi";
    }
  | { key: "removeBranding"; source: "plans"; labelKey: "removeBranding" }
> = [
  { key: "targeting", labelKey: "featureTargeting", source: "billing" },
  { key: "abTesting", labelKey: "featureAb", source: "billing" },
  { key: "passwordProtection", labelKey: "featurePassword", source: "billing" },
  { key: "cloaking", labelKey: "featureCloak", source: "billing" },
  { key: "qrLogo", labelKey: "featureQrLogo", source: "billing" },
  { key: "webhooks", labelKey: "featureWebhooks", source: "billing" },
  { key: "apiAccess", labelKey: "featureApi", source: "billing" },
  { key: "removeBranding", labelKey: "removeBranding", source: "plans" },
];

export function PlansEditor({ rows }: { rows: PlanEditorRow[] }) {
  const router = useRouter();
  const t = useTranslations("admin.plans");
  const tNav = useTranslations("admin.nav");
  const tc = useTranslations("common");
  const tb = useTranslations("billing");
  const te = useTranslations("errors");
  const actionMessage = useActionMessage();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<PlanEditorRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save(): void {
    if (!draft) {
      return;
    }
    const payload: PlanUpdateInput = {
      key: draft.key,
      name: draft.name,
      priceMonthly: draft.priceMonthly,
      priceYearly: draft.priceYearly,
      currency: draft.currency,
      stripePriceMonthlyId: draft.stripePriceMonthlyId,
      stripePriceYearlyId: draft.stripePriceYearlyId,
      visible: draft.visible,
      limits: draft.limits,
      features: draft.features,
    };

    setError(null);
    startTransition(async () => {
      const result = await updatePlanAction(payload);
      if (!result.ok) {
        setError(actionMessage(result.error));
        return;
      }
      setDraft(null);
      router.refresh();
    });
  }

  function featureLabel(field: (typeof FEATURE_FIELDS)[number]): string {
    if (field.source === "billing") {
      return tb(field.labelKey);
    }
    return t(field.labelKey);
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>{tNav("plan")}</TableHeaderCell>
            <TableHeaderCell className="text-right">{tc("monthly")}</TableHeaderCell>
            <TableHeaderCell className="text-right">{tc("yearly")}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t("limitLinks")}</TableHeaderCell>
            <TableHeaderCell className="text-right">{tb("limitClicks")}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t("subscribers")}</TableHeaderCell>
            <TableHeaderCell className="text-right">{tc("edit")}</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{row.name}</span>
                  {row.visible ? null : <Badge tone="muted">{t("hidden")}</Badge>}
                  {isInternalPlan(row.key) ? <Badge tone="accent">{t("staff")}</Badge> : null}
                  {row.stripePriceMonthlyId ?? row.stripePriceYearlyId ? null : (
                    <Badge tone="warn">{t("noStripe")}</Badge>
                  )}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(row.priceMonthly, row.currency)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(row.priceYearly, row.currency)}
              </TableCell>
              <TableCell className="text-right font-mono">{formatLimit(row.limits.links)}</TableCell>
              <TableCell className="text-right font-mono">
                {formatLimit(row.limits.clicksPerMonth)}
              </TableCell>
              <TableCell className="text-right font-mono">{row.subscribers}</TableCell>
              <TableCell>
                <span className="flex justify-end">
                  <Button
                    size="sm"
                    icon
                    aria-label={t("editAria", { name: row.name })}
                    onClick={() => setDraft({ ...row })}
                  >
                    <Icon name="pen" className="text-sm" />
                  </Button>
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet
        open={draft !== null}
        size="lg"
        title={draft ? t("editTitle", { name: draft.name }) : t("editTitleFallback")}
        description={t("editDesc")}
        onClose={() => setDraft(null)}
        footer={
          <>
            <Button onClick={() => setDraft(null)}>{tc("cancel")}</Button>
            <Button variant="primary" disabled={pending} onClick={save}>
              {t("savePlan")}
            </Button>
          </>
        }
      >
        {draft ? (
          <div className="flex min-w-0 flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={tNav("name")}>
                <Input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </Field>
              <Field label={t("currency")}>
                <Select
                  value={draft.currency}
                  onChange={(event) =>
                    setDraft({ ...draft, currency: event.target.value as "USD" | "TRY" | "EUR" })
                  }
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="TRY">TRY</option>
                </Select>
              </Field>
              <Field label={t("monthlyPrice")} hint={t("minorUnitsHint")}>
                <Input
                  type="number"
                  min={0}
                  value={draft.priceMonthly}
                  onChange={(event) =>
                    setDraft({ ...draft, priceMonthly: Number(event.target.value) })
                  }
                />
              </Field>
              <Field label={t("yearlyPrice")} hint={t("minorUnitsHint")}>
                <Input
                  type="number"
                  min={0}
                  value={draft.priceYearly}
                  onChange={(event) =>
                    setDraft({ ...draft, priceYearly: Number(event.target.value) })
                  }
                />
              </Field>
              <Field label={t("stripeMonthly")}>
                <Input
                  value={draft.stripePriceMonthlyId ?? ""}
                  placeholder={t("pricePlaceholder")}
                  onChange={(event) =>
                    setDraft({ ...draft, stripePriceMonthlyId: event.target.value })
                  }
                />
              </Field>
              <Field label={t("stripeYearly")}>
                <Input
                  value={draft.stripePriceYearlyId ?? ""}
                  placeholder={t("pricePlaceholder")}
                  onChange={(event) =>
                    setDraft({ ...draft, stripePriceYearlyId: event.target.value })
                  }
                />
              </Field>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
              <span className="min-w-0">
                <span className="block text-sm font-medium">{t("visible")}</span>
                <span className="block text-xs text-fg-subtle">
                  {isInternalPlan(draft.key) ? te("infinity_hidden") : t("hidePlanHint")}
                </span>
              </span>
              <Switch
                checked={draft.visible}
                disabled={isInternalPlan(draft.key)}
                onCheckedChange={(visible) => setDraft({ ...draft, visible })}
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-5">
              <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
                {t("limits")}
              </span>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {LIMIT_FIELDS.map((field) => (
                  <Field
                    key={field.key}
                    label={t(field.labelKey)}
                    hint={field.hintKey ? t(field.hintKey) : undefined}
                  >
                    <Input
                      type="number"
                      min={-1}
                      value={draft.limits[field.key]}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          limits: { ...draft.limits, [field.key]: Number(event.target.value) },
                        })
                      }
                    />
                  </Field>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-5">
              <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
                {t("features")}
              </span>
              {FEATURE_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-fg-muted">{featureLabel(field)}</span>
                  <Switch
                    checked={draft.features[field.key]}
                    onCheckedChange={(checked) =>
                      setDraft({
                        ...draft,
                        features: { ...draft.features, [field.key]: checked },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}

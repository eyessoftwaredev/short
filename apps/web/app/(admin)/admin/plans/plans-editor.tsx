"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import type { PlanFeatures, PlanKey, PlanLimits } from "@short/core";
import { isInternalPlan } from "@short/core";
import {
  Badge,
  Button,
  Callout,
  Field,
  InfoTip,
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
  toast,
} from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { formatCurrency, formatNumber } from "@/lib/format";
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

type LimitKey = keyof PlanLimits;
type LimitLabelKey =
  | "limitLinks"
  | "limitClicks"
  | "limitDomains"
  | "limitBio"
  | "limitQr"
  | "limitMembers"
  | "limitTeams"
  | "limitRetention"
  | "limitApi";

/** Grouped the way people think about a plan: what you can make, how much it is used, who uses it. */
const LIMIT_GROUPS: Array<{ titleKey: "groupContent" | "groupUsage" | "groupTeam"; fields: Array<{ key: LimitKey; labelKey: LimitLabelKey }> }> = [
  {
    titleKey: "groupContent",
    fields: [
      { key: "links", labelKey: "limitLinks" },
      { key: "customDomains", labelKey: "limitDomains" },
      { key: "biopages", labelKey: "limitBio" },
      { key: "qrCodes", labelKey: "limitQr" },
    ],
  },
  {
    titleKey: "groupUsage",
    fields: [
      { key: "clicksPerMonth", labelKey: "limitClicks" },
      { key: "retentionDays", labelKey: "limitRetention" },
      { key: "apiRequestsPerHour", labelKey: "limitApi" },
    ],
  },
  {
    titleKey: "groupTeam",
    fields: [
      { key: "members", labelKey: "limitMembers" },
      { key: "teams", labelKey: "limitTeams" },
    ],
  },
];

type BillingFeatureKey =
  | "featureTargeting"
  | "featureAb"
  | "featurePassword"
  | "featureCloak"
  | "featureQrLogo"
  | "featureWebhooks"
  | "featureApi"
  | "featureShortSlugs"
  | "featureCustomCss"
  | "featureBioForms";

type FeatureField =
  | { key: keyof PlanFeatures; source: "billing"; labelKey: BillingFeatureKey }
  | { key: "removeBranding"; source: "plans"; labelKey: "removeBranding" };

const FEATURE_GROUPS: Array<{ titleKey: "groupLinks" | "groupBioQr" | "groupDevelopers"; fields: FeatureField[] }> = [
  {
    titleKey: "groupLinks",
    fields: [
      { key: "targeting", labelKey: "featureTargeting", source: "billing" },
      { key: "abTesting", labelKey: "featureAb", source: "billing" },
      { key: "passwordProtection", labelKey: "featurePassword", source: "billing" },
      { key: "cloaking", labelKey: "featureCloak", source: "billing" },
      { key: "shortSlugs", labelKey: "featureShortSlugs", source: "billing" },
    ],
  },
  {
    titleKey: "groupBioQr",
    fields: [
      { key: "qrLogo", labelKey: "featureQrLogo", source: "billing" },
      { key: "customCss", labelKey: "featureCustomCss", source: "billing" },
      { key: "bioForms", labelKey: "featureBioForms", source: "billing" },
      { key: "removeBranding", labelKey: "removeBranding", source: "plans" },
    ],
  },
  {
    titleKey: "groupDevelopers",
    fields: [
      { key: "webhooks", labelKey: "featureWebhooks", source: "billing" },
      { key: "apiAccess", labelKey: "featureApi", source: "billing" },
    ],
  },
];

type Draft = Omit<PlanEditorRow, "priceMonthly" | "priceYearly"> & {
  /** Edited in normal units ("9.99"), stored in minor units (999). */
  priceMonthlyText: string;
  priceYearlyText: string;
};

function toDraft(row: PlanEditorRow): Draft {
  return {
    ...row,
    priceMonthlyText: (row.priceMonthly / 100).toFixed(2),
    priceYearlyText: (row.priceYearly / 100).toFixed(2),
  };
}

/** "9,99" and "9.99" both work; anything else is `null`. */
function toMinorUnits(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (normalized === "") {
    return 0;
  }
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    return null;
  }
  return Math.round(Number(normalized) * 100);
}

function SheetSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-4 border-t border-border-subtle pt-5 first:border-t-0 first:pt-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h3 className="m-0 text-sm font-semibold text-ink">{title}</h3>
        {description ? <p className="m-0 text-[13px] leading-5 text-fg-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function PlansEditor({ rows }: { rows: PlanEditorRow[] }) {
  const router = useRouter();
  const t = useTranslations("admin.plans");
  const tNav = useTranslations("admin.nav");
  const tc = useTranslations("common");
  const tb = useTranslations("billing");
  const te = useTranslations("errors");
  const actionMessage = useActionMessage();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const monthlyMinor = draft ? toMinorUnits(draft.priceMonthlyText) : 0;
  const yearlyMinor = draft ? toMinorUnits(draft.priceYearlyText) : 0;

  function open(row: PlanEditorRow): void {
    setError(null);
    setDraft(toDraft(row));
  }

  function limitLabel(value: number, key: LimitKey): string {
    if (value === -1) {
      return tc("unlimited");
    }
    return key === "retentionDays" ? tc("days", { count: value }) : formatNumber(value);
  }

  function setLimit(key: LimitKey, value: number): void {
    setDraft((current) => (current ? { ...current, limits: { ...current.limits, [key]: value } } : current));
  }

  function save(): void {
    if (!draft) {
      return;
    }
    if (monthlyMinor === null || yearlyMinor === null) {
      setError(t("priceInvalid"));
      return;
    }
    const payload: PlanUpdateInput = {
      key: draft.key,
      name: draft.name.trim(),
      priceMonthly: monthlyMinor,
      priceYearly: yearlyMinor,
      currency: draft.currency,
      stripePriceMonthlyId: draft.stripePriceMonthlyId?.trim() || null,
      stripePriceYearlyId: draft.stripePriceYearlyId?.trim() || null,
      visible: draft.visible,
      limits: draft.limits,
      features: draft.features,
    };

    setError(null);
    startTransition(async () => {
      const result = await updatePlanAction(payload);
      if (!result.ok) {
        setError(result.error === "validation" ? t("saveInvalid") : actionMessage(result.error));
        return;
      }
      toast.success(t("savedToast", { name: payload.name }));
      setDraft(null);
      router.refresh();
    });
  }

  function featureLabel(field: FeatureField): string {
    return field.source === "billing" ? tb(field.labelKey) : t(field.labelKey);
  }

  return (
    <>
      <Table label={t("title")}>
        <TableHead>
          <TableRow>
            <TableHeaderCell>{tNav("plan")}</TableHeaderCell>
            <TableHeaderCell numeric>{tc("monthly")}</TableHeaderCell>
            <TableHeaderCell numeric className="hidden sm:table-cell">
              {tc("yearly")}
            </TableHeaderCell>
            <TableHeaderCell numeric className="hidden md:table-cell">
              {t("limitLinks")}
            </TableHeaderCell>
            <TableHeaderCell numeric className="hidden lg:table-cell">
              {tb("limitClicks")}
            </TableHeaderCell>
            <TableHeaderCell numeric>
              <span className="inline-flex items-center gap-1.5">
                {t("subscribers")}
                <InfoTip label={t("subscribers")}>{t("subscribersInfo")}</InfoTip>
              </span>
            </TableHeaderCell>
            <TableHeaderCell className="w-px">
              <span className="sr-only">{tc("edit")}</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell>
                <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium text-ink">{row.name}</span>
                  {row.visible ? null : (
                    <Badge tone="neutral" size="sm">
                      {t("hidden")}
                    </Badge>
                  )}
                  {isInternalPlan(row.key) ? (
                    <Badge tone="accent" size="sm">
                      {t("staff")}
                    </Badge>
                  ) : null}
                  {row.key !== "free" && !isInternalPlan(row.key) && !(row.stripePriceMonthlyId ?? row.stripePriceYearlyId) ? (
                    <Badge tone="warn" dot size="sm">
                      {t("noStripe")}
                    </Badge>
                  ) : null}
                </span>
              </TableCell>
              <TableCell numeric>{formatCurrency(row.priceMonthly, row.currency)}</TableCell>
              <TableCell numeric className="hidden sm:table-cell">
                {formatCurrency(row.priceYearly, row.currency)}
              </TableCell>
              <TableCell numeric className="hidden md:table-cell">
                {limitLabel(row.limits.links, "links")}
              </TableCell>
              <TableCell numeric className="hidden lg:table-cell">
                {limitLabel(row.limits.clicksPerMonth, "clicksPerMonth")}
              </TableCell>
              <TableCell numeric>{formatNumber(row.subscribers)}</TableCell>
              <TableCell align="right">
                <Button
                  size="sm"
                  leadingIcon="pen"
                  aria-label={t("editAria", { name: row.name })}
                  onClick={() => open(row)}
                >
                  {tc("edit")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet
        open={draft !== null}
        size="lg"
        title={draft ? t("editTitle", { name: draft.name }) : t("editTitleFallback")}
        description={draft && draft.subscribers > 0 ? t("editDescSubscribers", { count: draft.subscribers }) : t("editDesc")}
        onClose={() => (pending ? undefined : setDraft(null))}
        footer={
          <>
            <Button onClick={() => setDraft(null)} disabled={pending}>
              {tc("cancel")}
            </Button>
            <Button variant="primary" loading={pending} onClick={save}>
              {t("savePlan")}
            </Button>
          </>
        }
      >
        {draft ? (
          <div className="flex min-w-0 flex-col gap-6">
            {error ? <Callout tone="danger" title={error} onDismiss={() => setError(null)} /> : null}

            <SheetSection title={t("groupBasics")}>
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={tNav("name")} info={t("nameInfo")}>
                  <Input
                    value={draft.name}
                    maxLength={40}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  />
                </Field>
                <Field label={t("currency")} info={t("currencyInfo")}>
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
                <Field
                  label={t("monthlyPrice")}
                  info={t("monthlyPriceInfo")}
                  hint={monthlyMinor === null ? undefined : t("pricePreview", { price: formatCurrency(monthlyMinor, draft.currency) })}
                  error={monthlyMinor === null ? t("priceInvalid") : undefined}
                >
                  <Input
                    inputMode="decimal"
                    prefix={draft.currency}
                    value={draft.priceMonthlyText}
                    aria-invalid={monthlyMinor === null ? true : undefined}
                    onChange={(event) => setDraft({ ...draft, priceMonthlyText: event.target.value })}
                  />
                </Field>
                <Field
                  label={t("yearlyPrice")}
                  info={t("yearlyPriceInfo")}
                  hint={
                    yearlyMinor === null
                      ? undefined
                      : monthlyMinor && yearlyMinor && monthlyMinor * 12 > yearlyMinor
                        ? t("yearlySaving", {
                            percent: Math.round((1 - yearlyMinor / (monthlyMinor * 12)) * 100),
                          })
                        : t("pricePreview", { price: formatCurrency(yearlyMinor, draft.currency) })
                  }
                  error={yearlyMinor === null ? t("priceInvalid") : undefined}
                >
                  <Input
                    inputMode="decimal"
                    prefix={draft.currency}
                    value={draft.priceYearlyText}
                    aria-invalid={yearlyMinor === null ? true : undefined}
                    onChange={(event) => setDraft({ ...draft, priceYearlyText: event.target.value })}
                  />
                </Field>
              </div>
              <div className="flex min-w-0 items-center justify-between gap-4 rounded-md bg-surface-subtle px-4 py-3">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                    {t("visible")}
                    <InfoTip label={t("visible")}>{t("visibleInfo")}</InfoTip>
                  </span>
                  <span className="text-[13px] text-fg-muted">
                    {isInternalPlan(draft.key) ? te("infinity_hidden") : t("hidePlanHint")}
                  </span>
                </span>
                <Switch
                  checked={draft.visible}
                  disabled={isInternalPlan(draft.key)}
                  aria-label={t("visible")}
                  onCheckedChange={(visible) => setDraft({ ...draft, visible })}
                />
              </div>
            </SheetSection>

            <SheetSection title={t("groupStripe")} description={t("groupStripeDesc")}>
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("stripeMonthly")} info={t("stripeMonthlyInfo")}>
                  <Input
                    className="font-mono"
                    value={draft.stripePriceMonthlyId ?? ""}
                    placeholder={t("pricePlaceholder")}
                    spellCheck={false}
                    onChange={(event) => setDraft({ ...draft, stripePriceMonthlyId: event.target.value })}
                  />
                </Field>
                <Field label={t("stripeYearly")} info={t("stripeYearlyInfo")}>
                  <Input
                    className="font-mono"
                    value={draft.stripePriceYearlyId ?? ""}
                    placeholder={t("pricePlaceholder")}
                    spellCheck={false}
                    onChange={(event) => setDraft({ ...draft, stripePriceYearlyId: event.target.value })}
                  />
                </Field>
              </div>
            </SheetSection>

            <SheetSection title={t("limits")} description={t("limitsDesc")}>
              {LIMIT_GROUPS.map((group) => (
                <div key={group.titleKey} className="flex min-w-0 flex-col gap-3">
                  <span className="text-[13px] font-medium text-fg-subtle">{t(group.titleKey)}</span>
                  <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                    {group.fields.map((field) => {
                      const value = draft.limits[field.key];
                      const unlimited = value === -1;
                      return (
                        <Field key={field.key} label={t(field.labelKey)} info={t(`limitInfo.${field.key}`)}>
                          {/* The toggle sits beside the input, not inside it: a disabled input
                              wrapper swallows clicks, which would trap "Unlimited" on. */}
                          <span className="flex min-w-0 items-center gap-3">
                            <Input
                              type="number"
                              min={field.key === "retentionDays" ? 1 : 0}
                              className="min-w-0 flex-1"
                              value={unlimited ? "" : value}
                              placeholder={unlimited ? tc("unlimited") : undefined}
                              disabled={unlimited}
                              onChange={(event) => {
                                const next = Number(event.target.value);
                                setLimit(field.key, Number.isFinite(next) ? Math.max(0, Math.trunc(next)) : 0);
                              }}
                            />
                            <span className="flex shrink-0 items-center gap-1.5 text-xs text-fg-muted">
                              <Switch
                                size="sm"
                                checked={unlimited}
                                aria-label={t("unlimitedToggle", { label: t(field.labelKey) })}
                                onCheckedChange={(on) =>
                                  setLimit(field.key, on ? -1 : field.key === "retentionDays" ? 30 : 0)
                                }
                              />
                              {tc("unlimited")}
                            </span>
                          </span>
                        </Field>
                      );
                    })}
                  </div>
                </div>
              ))}
            </SheetSection>

            <SheetSection title={t("features")} description={t("featuresDesc")}>
              {FEATURE_GROUPS.map((group) => (
                <div key={group.titleKey} className="flex min-w-0 flex-col gap-1">
                  <span className="pb-1 text-[13px] font-medium text-fg-subtle">{t(group.titleKey)}</span>
                  <ul className="m-0 flex list-none flex-col divide-y divide-border-subtle p-0">
                    {group.fields.map((field) => (
                      <li key={field.key} className="flex min-w-0 items-center justify-between gap-3 py-2.5">
                        <span className="flex min-w-0 items-center gap-1.5 text-sm text-ink">
                          <span className="min-w-0 truncate">{featureLabel(field)}</span>
                          <InfoTip label={featureLabel(field)}>{t(`featureInfo.${field.key}`)}</InfoTip>
                        </span>
                        <Switch
                          checked={draft.features[field.key]}
                          aria-label={featureLabel(field)}
                          onCheckedChange={(checked) =>
                            setDraft({ ...draft, features: { ...draft.features, [field.key]: checked } })
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </SheetSection>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}

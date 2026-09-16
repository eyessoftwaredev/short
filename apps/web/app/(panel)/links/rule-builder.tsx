"use client";

import { Icon } from "@/components/kit/icon";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  BROWSER_VALUES,
  DEVICE_VALUES,
  OS_VALUES,
  type Condition,
  type TargetRule,
} from "@short/core";
import { Badge, Button, Card, Chip, EmptyState, Field, Input, Select } from "@/components/ui";

const CONDITION_TYPES: Array<Condition["type"]> = [
  "country",
  "continent",
  "region",
  "device",
  "os",
  "browser",
  "language",
  "referrer",
  "schedule",
];

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function conditionLabel(
  type: Condition["type"],
  t: ReturnType<typeof useTranslations>,
): string {
  switch (type) {
    case "country":
      return t("condition.country");
    case "continent":
      return t("condition.continent");
    case "region":
      return t("condition.region");
    case "device":
      return t("condition.device");
    case "os":
      return t("condition.os");
    case "browser":
      return t("condition.browser");
    case "language":
      return t("condition.language");
    case "referrer":
      return t("condition.referrer");
    case "schedule":
      return t("condition.schedule");
  }
}

function weekdayLabel(index: number, t: ReturnType<typeof useTranslations>): string {
  switch (index) {
    case 0:
      return t("weekday.sun");
    case 1:
      return t("weekday.mon");
    case 2:
      return t("weekday.tue");
    case 3:
      return t("weekday.wed");
    case 4:
      return t("weekday.thu");
    case 5:
      return t("weekday.fri");
    case 6:
      return t("weekday.sat");
    default:
      return WEEKDAY_KEYS[index] ?? "";
  }
}

function deviceLabel(value: string, t: ReturnType<typeof useTranslations>): string {
  switch (value) {
    case "mobile":
      return t("device.mobile");
    case "tablet":
      return t("device.tablet");
    case "desktop":
      return t("device.desktop");
    default:
      return value;
  }
}

function newCondition(type: Condition["type"]): Condition {
  switch (type) {
    case "device":
      return { type: "device", op: "in", values: ["mobile"] };
    case "os":
    case "browser":
    case "language":
      return { type, op: "in", values: [] };
    case "referrer":
      return { type: "referrer", op: "contains", value: "" };
    case "schedule":
      return {
        type: "schedule",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        from: "09:00",
        to: "18:00",
        days: [1, 2, 3, 4, 5],
      };
    default:
      return { type, op: "in", values: [] };
  }
}

function describeCondition(
  condition: Condition,
  t: ReturnType<typeof useTranslations>,
): string {
  switch (condition.type) {
    case "referrer":
      if (condition.op === "empty") {
        return t("descNoReferrer");
      }
      if (condition.op === "not_empty") {
        return t("descAnyReferrer");
      }
      return t("descReferrer", {
        op: condition.op === "equals" ? t("opEquals") : t("opContains"),
        value: condition.value ?? "",
      });
    case "schedule":
      return `${condition.from}–${condition.to} ${condition.timezone}`;
    default: {
      const values = condition.values
        .map((value) => (condition.type === "device" ? deviceLabel(value, t) : value))
        .join(", ");
      return t("descSet", {
        type: conditionLabel(condition.type, t),
        op: condition.op === "not_in" ? t("opNotInShort") : t("opInShort"),
        values,
      });
    }
  }
}

type TokenListProps = {
  label: string;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
};

/** Comma-separated entry keeps geo lists fast to paste without a 250-row picker. */
function TokenList({ label, hint, values, onChange }: TokenListProps) {
  const text = useMemo(() => values.join(", "), [values]);
  return (
    <Field label={label} hint={hint}>
      <Input
        value={text}
        onChange={(event) =>
          onChange(
            event.target.value
              .split(",")
              .map((token) => token.trim())
              .filter((token) => token !== ""),
          )
        }
      />
    </Field>
  );
}

type OptionChipsProps = {
  label: string;
  options: readonly string[];
  values: string[];
  onChange: (values: string[]) => void;
  formatOption?: (option: string) => string;
};

function OptionChips({ label, options, values, onChange, formatOption }: OptionChipsProps) {
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2 pt-1">
        {options.map((option) => {
          const active = values.includes(option);
          return (
            <Chip
              key={option}
              active={active}
              onClick={() =>
                onChange(
                  active ? values.filter((value) => value !== option) : [...values, option],
                )
              }
            >
              {formatOption ? formatOption(option) : option}
            </Chip>
          );
        })}
      </div>
    </Field>
  );
}

function ConditionEditor({
  condition,
  onChange,
  onRemove,
}: {
  condition: Condition;
  onChange: (next: Condition) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("links");

  return (
    <div className="flex flex-col gap-3 rounded-default border border-border bg-surface-subtle p-4">
      <div className="flex items-end gap-2">
        <Field label={t("when")} className="flex-1">
          <Select
            value={condition.type}
            onChange={(event) => onChange(newCondition(event.target.value as Condition["type"]))}
          >
            {CONDITION_TYPES.map((type) => (
              <option key={type} value={type}>
                {conditionLabel(type, t)}
              </option>
            ))}
          </Select>
        </Field>

        {condition.type !== "schedule" ? (
          <Field label={t("operator")} className="w-40">
            <Select
              value={condition.op}
              onChange={(event) =>
                onChange({ ...condition, op: event.target.value } as Condition)
              }
            >
              {condition.type === "referrer" ? (
                <>
                  <option value="contains">{t("opContains")}</option>
                  <option value="equals">{t("opEquals")}</option>
                  <option value="empty">{t("opEmpty")}</option>
                  <option value="not_empty">{t("opNotEmpty")}</option>
                </>
              ) : (
                <>
                  <option value="in">{t("opIn")}</option>
                  <option value="not_in">{t("opNotIn")}</option>
                </>
              )}
            </Select>
          </Field>
        ) : null}

        <Button variant="ghost" icon aria-label={t("removeCondition")} onClick={onRemove}>
          <Icon name="trash" className="text-sm text-danger" />
        </Button>
      </div>

      {condition.type === "country" ? (
        <TokenList
          label={t("countries")}
          hint={t("countriesHint")}
          values={condition.values}
          onChange={(values) => onChange({ ...condition, values })}
        />
      ) : null}

      {condition.type === "continent" ? (
        <TokenList
          label={t("continents")}
          hint={t("continentsHint")}
          values={condition.values}
          onChange={(values) => onChange({ ...condition, values })}
        />
      ) : null}

      {condition.type === "region" ? (
        <TokenList
          label={t("regions")}
          hint={t("regionsHint")}
          values={condition.values}
          onChange={(values) => onChange({ ...condition, values })}
        />
      ) : null}

      {condition.type === "language" ? (
        <TokenList
          label={t("languages")}
          hint={t("languagesHint")}
          values={condition.values}
          onChange={(values) => onChange({ ...condition, values })}
        />
      ) : null}

      {condition.type === "device" ? (
        <OptionChips
          label={t("devices")}
          options={DEVICE_VALUES}
          values={condition.values}
          formatOption={(option) => deviceLabel(option, t)}
          onChange={(values) =>
            onChange({ ...condition, values: values as typeof condition.values })
          }
        />
      ) : null}

      {condition.type === "os" ? (
        <OptionChips
          label={t("operatingSystems")}
          options={OS_VALUES}
          values={condition.values}
          onChange={(values) => onChange({ ...condition, values })}
        />
      ) : null}

      {condition.type === "browser" ? (
        <OptionChips
          label={t("browsers")}
          options={BROWSER_VALUES}
          values={condition.values}
          onChange={(values) => onChange({ ...condition, values })}
        />
      ) : null}

      {condition.type === "referrer" && condition.op !== "empty" && condition.op !== "not_empty" ? (
        <Field label={t("value")} hint={t("valueHint")}>
          <Input
            value={condition.value ?? ""}
            placeholder={t("referrerPlaceholder")}
            onChange={(event) => onChange({ ...condition, value: event.target.value })}
          />
        </Field>
      ) : null}

      {condition.type === "schedule" ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            <Field label={t("from")} className="w-28">
              <Input
                type="time"
                value={condition.from}
                onChange={(event) => onChange({ ...condition, from: event.target.value })}
              />
            </Field>
            <Field label={t("to")} className="w-28">
              <Input
                type="time"
                value={condition.to}
                onChange={(event) => onChange({ ...condition, to: event.target.value })}
              />
            </Field>
            <Field label={t("timezone")} className="flex-1" hint={t("timezoneHint")}>
              <Input
                value={condition.timezone}
                onChange={(event) => onChange({ ...condition, timezone: event.target.value })}
              />
            </Field>
          </div>
          <Field label={t("days")}>
            <div className="flex flex-wrap gap-2 pt-1">
              {WEEKDAY_KEYS.map((day, index) => {
                const active = condition.days.includes(index);
                return (
                  <Chip
                    key={day}
                    active={active}
                    onClick={() =>
                      onChange({
                        ...condition,
                        days: active
                          ? condition.days.filter((value) => value !== index)
                          : [...condition.days, index].sort((a, b) => a - b),
                      })
                    }
                  >
                    {weekdayLabel(index, t)}
                  </Chip>
                );
              })}
            </div>
          </Field>
        </div>
      ) : null}
    </div>
  );
}

type RuleBuilderProps = {
  rules: TargetRule[];
  onChange: (rules: TargetRule[]) => void;
  disabled?: boolean;
};

export function RuleBuilder({ rules, onChange, disabled = false }: RuleBuilderProps) {
  const t = useTranslations("links");

  const addRule = (): void => {
    onChange([
      ...rules,
      {
        id: crypto.randomUUID(),
        priority: rules.length + 1,
        conditions: [newCondition("country")],
        destination: "",
      },
    ]);
  };

  const patchRule = (index: number, patch: Partial<TargetRule>): void => {
    onChange(rules.map((rule, position) => (position === index ? { ...rule, ...patch } : rule)));
  };

  if (disabled) {
    return (
      <EmptyState
        eyebrow={t("paywallEyebrow")}
        title={t("paywallTitle")}
        description={t("paywallBody")}
        actions={
          <Button variant="primary" onClick={() => window.location.assign("/billing")}>
            {t("seePlans")}
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-sm text-fg-muted">{t("rulesIntro")}</p>

      {rules.length === 0 ? (
        <EmptyState
          title={t("noRulesTitle")}
          description={t("noRulesBody")}
          actions={
            <Button variant="primary" onClick={addRule}>
              <Icon name="plus" className="text-sm" />
              {t("addRule")}
            </Button>
          }
        />
      ) : null}

      {rules.map((rule, index) => (
        <Card key={rule.id} staticHover className="gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge tone="muted">{t("priorityBadge", { priority: rule.priority })}</Badge>
              {rule.conditions.length > 0 ? (
                <span className="font-mono text-xs text-fg-subtle">
                  {rule.conditions.map((condition) => describeCondition(condition, t)).join(` ${t("and")} `)}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Field label={t("priority")} className="w-24">
                <Input
                  type="number"
                  min={0}
                  max={999}
                  value={rule.priority}
                  onChange={(event) =>
                    patchRule(index, { priority: Number(event.target.value) || 0 })
                  }
                />
              </Field>
              <Button
                variant="ghost"
                icon
                aria-label={t("removeRule")}
                onClick={() => onChange(rules.filter((_, position) => position !== index))}
              >
                <Icon name="trash" className="text-sm text-danger" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {rule.conditions.map((condition, conditionIndex) => (
              <ConditionEditor
                key={`${rule.id}-${conditionIndex}`}
                condition={condition}
                onChange={(next) =>
                  patchRule(index, {
                    conditions: rule.conditions.map((item, position) =>
                      position === conditionIndex ? next : item,
                    ),
                  })
                }
                onRemove={() =>
                  patchRule(index, {
                    conditions: rule.conditions.filter(
                      (_, position) => position !== conditionIndex,
                    ),
                  })
                }
              />
            ))}
            <Button
              size="sm"
              onClick={() =>
                patchRule(index, { conditions: [...rule.conditions, newCondition("device")] })
              }
            >
              <Icon name="plus" className="text-sm" />
              {t("addCondition")}
            </Button>
          </div>

          <Field label={t("sendTo")}>
            <Input
              value={rule.destination}
              placeholder={t("ruleDestinationPlaceholder")}
              onChange={(event) => patchRule(index, { destination: event.target.value })}
            />
          </Field>
        </Card>
      ))}

      {rules.length > 0 ? (
        <Button onClick={addRule}>
          <Icon name="plus" className="text-sm" />
          {t("addRule")}
        </Button>
      ) : null}
    </div>
  );
}

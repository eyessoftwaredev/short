"use client";

import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  BROWSER_VALUES,
  DEVICE_VALUES,
  OS_VALUES,
  type Condition,
  type TargetRule,
} from "@short/core";
import { Badge, Button, Card, Chip, EmptyState, Field, Input, Select } from "@/components/ui";

const CONDITION_TYPES: Array<{ value: Condition["type"]; label: string }> = [
  { value: "country", label: "Country" },
  { value: "continent", label: "Continent" },
  { value: "region", label: "Region" },
  { value: "device", label: "Device" },
  { value: "os", label: "Operating system" },
  { value: "browser", label: "Browser" },
  { value: "language", label: "Language" },
  { value: "referrer", label: "Referrer" },
  { value: "schedule", label: "Schedule" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function describeCondition(condition: Condition): string {
  switch (condition.type) {
    case "referrer":
      return condition.op === "empty"
        ? "no referrer"
        : condition.op === "not_empty"
          ? "any referrer"
          : `referrer ${condition.op} ${condition.value ?? ""}`;
    case "schedule":
      return `${condition.from}–${condition.to} ${condition.timezone}`;
    default:
      return `${condition.type} ${condition.op === "not_in" ? "not in" : "in"} ${condition.values.join(", ")}`;
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
};

function OptionChips({ label, options, values, onChange }: OptionChipsProps) {
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
              {option}
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
  return (
    <div className="flex flex-col gap-3 rounded-default border border-border bg-surface-subtle p-4">
      <div className="flex items-end gap-2">
        <Field label="When" className="flex-1">
          <Select
            value={condition.type}
            onChange={(event) => onChange(newCondition(event.target.value as Condition["type"]))}
          >
            {CONDITION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </Field>

        {condition.type !== "schedule" ? (
          <Field label="Operator" className="w-40">
            <Select
              value={condition.op}
              onChange={(event) =>
                onChange({ ...condition, op: event.target.value } as Condition)
              }
            >
              {condition.type === "referrer" ? (
                <>
                  <option value="contains">contains</option>
                  <option value="equals">equals host</option>
                  <option value="empty">is empty</option>
                  <option value="not_empty">is not empty</option>
                </>
              ) : (
                <>
                  <option value="in">is one of</option>
                  <option value="not_in">is not one of</option>
                </>
              )}
            </Select>
          </Field>
        ) : null}

        <Button variant="ghost" icon aria-label="Remove condition" onClick={onRemove}>
          <Trash2 className="size-4 text-danger" />
        </Button>
      </div>

      {condition.type === "country" ? (
        <TokenList
          label="Countries"
          hint="ISO 3166-1 alpha-2 codes, e.g. TR, DE, US"
          values={condition.values}
          onChange={(values) => onChange({ ...condition, values })}
        />
      ) : null}

      {condition.type === "continent" ? (
        <TokenList
          label="Continents"
          hint="EU, NA, SA, AS, AF, OC, AN"
          values={condition.values}
          onChange={(values) => onChange({ ...condition, values })}
        />
      ) : null}

      {condition.type === "region" ? (
        <TokenList
          label="Regions"
          hint="Region names as reported by Cloudflare, e.g. Istanbul"
          values={condition.values}
          onChange={(values) => onChange({ ...condition, values })}
        />
      ) : null}

      {condition.type === "language" ? (
        <TokenList
          label="Languages"
          hint="Primary subtags, e.g. tr, en, de"
          values={condition.values}
          onChange={(values) => onChange({ ...condition, values })}
        />
      ) : null}

      {condition.type === "device" ? (
        <OptionChips
          label="Devices"
          options={DEVICE_VALUES}
          values={condition.values}
          onChange={(values) =>
            onChange({ ...condition, values: values as typeof condition.values })
          }
        />
      ) : null}

      {condition.type === "os" ? (
        <OptionChips
          label="Operating systems"
          options={OS_VALUES}
          values={condition.values}
          onChange={(values) => onChange({ ...condition, values })}
        />
      ) : null}

      {condition.type === "browser" ? (
        <OptionChips
          label="Browsers"
          options={BROWSER_VALUES}
          values={condition.values}
          onChange={(values) => onChange({ ...condition, values })}
        />
      ) : null}

      {condition.type === "referrer" && condition.op !== "empty" && condition.op !== "not_empty" ? (
        <Field label="Value" hint="A domain or a fragment of the referring URL">
          <Input
            value={condition.value ?? ""}
            placeholder="google.com"
            onChange={(event) => onChange({ ...condition, value: event.target.value })}
          />
        </Field>
      ) : null}

      {condition.type === "schedule" ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            <Field label="From" className="w-28">
              <Input
                type="time"
                value={condition.from}
                onChange={(event) => onChange({ ...condition, from: event.target.value })}
              />
            </Field>
            <Field label="To" className="w-28">
              <Input
                type="time"
                value={condition.to}
                onChange={(event) => onChange({ ...condition, to: event.target.value })}
              />
            </Field>
            <Field label="Timezone" className="flex-1" hint="IANA name, e.g. Europe/Istanbul">
              <Input
                value={condition.timezone}
                onChange={(event) => onChange({ ...condition, timezone: event.target.value })}
              />
            </Field>
          </div>
          <Field label="Days">
            <div className="flex flex-wrap gap-2 pt-1">
              {WEEKDAYS.map((day, index) => {
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
                    {day}
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
        eyebrow="Pro"
        title="Targeting is a paid feature"
        description="Route visitors by country, device, OS, browser, language, referrer or schedule on the Pro plan and above."
        actions={
          <Button variant="primary" onClick={() => window.location.assign("/billing")}>
            See plans
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-sm text-fg-muted">
        Rules run in priority order and the first match wins. A rule matches only when every
        one of its conditions matches. Visitors matching nothing get the default destination.
      </p>

      {rules.length === 0 ? (
        <EmptyState
          title="No targeting rules"
          description="Add a rule to send specific audiences somewhere else."
          actions={
            <Button variant="primary" onClick={addRule}>
              <Plus className="size-4" />
              Add rule
            </Button>
          }
        />
      ) : null}

      {rules.map((rule, index) => (
        <Card key={rule.id} staticHover className="gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge tone="muted">Priority {rule.priority}</Badge>
              {rule.conditions.length > 0 ? (
                <span className="font-mono text-xs text-fg-subtle">
                  {rule.conditions.map(describeCondition).join(" AND ")}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Field label="Priority" className="w-24">
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
                aria-label="Remove rule"
                onClick={() => onChange(rules.filter((_, position) => position !== index))}
              >
                <Trash2 className="size-4 text-danger" />
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
              <Plus className="size-4" />
              Add condition
            </Button>
          </div>

          <Field label="Send matching visitors to">
            <Input
              value={rule.destination}
              placeholder="https://acme.com/tr"
              onChange={(event) => patchRule(index, { destination: event.target.value })}
            />
          </Field>
        </Card>
      ))}

      {rules.length > 0 ? (
        <Button onClick={addRule}>
          <Plus className="size-4" />
          Add rule
        </Button>
      ) : null}
    </div>
  );
}

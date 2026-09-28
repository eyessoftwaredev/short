"use client";

import { Icon } from "@/components/kit/icon";

import { useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  BROWSER_VALUES,
  DEVICE_VALUES,
  IN_APP_VALUES,
  LANGUAGE_VALUES,
  OS_VALUES,
  type Condition,
  type TargetRule,
} from "@short/core";
import {
  Badge,
  Button,
  Callout,
  Card,
  Chip,
  EmptyState,
  Field,
  InfoTip,
  Input,
  Select,
} from "@/components/ui";

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

/** Product names are not translated; only "other" is. */
const OS_LABELS: Record<string, string> = {
  ios: "iOS",
  android: "Android",
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
  chromeos: "ChromeOS",
};

const BROWSER_LABELS: Record<string, string> = {
  chrome: "Chrome",
  safari: "Safari",
  firefox: "Firefox",
  edge: "Edge",
  opera: "Opera",
  samsung: "Samsung Internet",
  ie: "Internet Explorer",
  instagram: "Instagram",
  facebook: "Facebook",
  messenger: "Messenger",
  tiktok: "TikTok",
  snapchat: "Snapchat",
  linkedin: "LinkedIn",
  twitter: "X (Twitter)",
  line: "LINE",
  wechat: "WeChat",
  pinterest: "Pinterest",
};

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

function clientLabel(
  labels: Record<string, string>,
  value: string,
  t: ReturnType<typeof useTranslations>,
): string {
  return value === "other" ? t("otherValue") : (labels[value] ?? value);
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

type DisplayNamesLike = { of: (code: string) => string | undefined };

function displayNames(locale: string, type: "region" | "language"): DisplayNamesLike | null {
  try {
    return new Intl.DisplayNames([locale, "en"], { type });
  } catch {
    return null;
  }
}

function namedValue(locale: string, type: "region" | "language", code: string): string {
  try {
    return displayNames(locale, type)?.of(code) ?? code;
  } catch {
    return code;
  }
}

function describeValue(
  type: Condition["type"],
  value: string,
  t: ReturnType<typeof useTranslations>,
  locale?: string,
): string {
  switch (type) {
    case "device":
      return deviceLabel(value, t);
    case "os":
      return clientLabel(OS_LABELS, value, t);
    case "browser":
      return clientLabel(BROWSER_LABELS, value, t);
    case "country":
      return locale && /^[A-Za-z]{2}$/.test(value) ? namedValue(locale, "region", value.toUpperCase()) : value;
    case "language":
      return locale ? namedValue(locale, "language", value) : value;
    default:
      return value;
  }
}

/**
 * One line per rule for the editor's summary: "Country in Turkey, Germany AND Device in
 * mobile". Countries and languages are shown by name when the runtime knows them.
 */
export function describeRuleConditions(
  rule: TargetRule,
  t: ReturnType<typeof useTranslations>,
  locale: string,
): string {
  return rule.conditions.map((condition) => describeCondition(condition, t, locale)).join(` ${t("and")} `);
}

function describeCondition(
  condition: Condition,
  t: ReturnType<typeof useTranslations>,
  locale?: string,
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
        .map((value) => describeValue(condition.type, value, t, locale))
        .join(", ");
      return t("descSet", {
        type: conditionLabel(condition.type, t),
        op: condition.op === "not_in" ? t("opNotInShort") : t("opInShort"),
        values,
      });
    }
  }
}

type FieldGroupProps = {
  label: string;
  info: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
};

/**
 * `Field` for chip groups. `Field` renders a `<label>`, and a label forwards clicks on its
 * caption to its first labelable descendant, which for a chip group is the first chip:
 * clicking the caption would silently toggle it.
 */
function FieldGroup({ label, info, hint, children }: FieldGroupProps) {
  return (
    <div role="group" aria-label={label} className="flex min-w-0 flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-sm font-medium">
        <span className="min-w-0">{label}</span>
        <InfoTip inline label={label}>
          {info}
        </InfoTip>
      </span>
      {children}
      {hint ? <span className="text-xs text-fg-subtle">{hint}</span> : null}
    </div>
  );
}

type TokenListProps = {
  label: string;
  info: ReactNode;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
};

/** Comma-separated entry keeps geo lists fast to paste without a 250-row picker. */
function TokenList({ label, info, hint, values, onChange }: TokenListProps) {
  const text = useMemo(() => values.join(", "), [values]);
  return (
    <Field label={label} info={info} hint={hint}>
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
  options: readonly string[];
  values: string[];
  onChange: (values: string[]) => void;
  formatOption?: (option: string) => string;
};

function OptionChips({ options, values, onChange, formatOption }: OptionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {options.map((option) => {
        const active = values.includes(option);
        return (
          <Chip
            key={option}
            active={active}
            onClick={() =>
              onChange(active ? values.filter((value) => value !== option) : [...values, option])
            }
          >
            {formatOption ? formatOption(option) : option}
          </Chip>
        );
      })}
    </div>
  );
}

const LANGUAGE_CODE = /^[a-z]{2,3}$/;
const KNOWN_LANGUAGES = new Set<string>(LANGUAGE_VALUES);

/** Searchable picker over ISO 639-1 codes, with names in the panel's own language. */
function LanguagePicker({
  values,
  onChange,
}: {
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const t = useTranslations("links");
  const locale = useLocale();
  const [query, setQuery] = useState("");

  const nameOf = useMemo(() => {
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames([locale, "en"], { type: "language" });
    } catch {
      names = null;
    }
    return (code: string): string => {
      try {
        return names?.of(code) ?? code;
      } catch {
        return code;
      }
    };
  }, [locale]);

  const options = useMemo(
    () =>
      LANGUAGE_VALUES.map((code) => ({ code, name: nameOf(code) })).sort((a, b) =>
        a.name.localeCompare(b.name, locale),
      ),
    [nameOf, locale],
  );

  const needle = query.trim().toLocaleLowerCase(locale);
  const matches =
    needle === ""
      ? options
      : options.filter(
          (option) =>
            option.code.startsWith(needle) || option.name.toLocaleLowerCase(locale).includes(needle),
        );
  const customCode =
    LANGUAGE_CODE.test(needle) && !KNOWN_LANGUAGES.has(needle) && !values.includes(needle)
      ? needle
      : null;

  const toggle = (code: string): void => {
    onChange(values.includes(code) ? values.filter((value) => value !== code) : [...values, code]);
  };

  return (
    <FieldGroup label={t("languages")} info={t("info.languages")} hint={t("languagesHint")}>
      <div className="flex flex-col gap-2">
        {values.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {values.map((code) => (
              <Chip
                key={code}
                active
                aria-label={t("removeLanguage", { language: nameOf(code) })}
                onClick={() => toggle(code)}
              >
                {nameOf(code)}
                <span className="font-mono text-xs">{code}</span>
                <Icon name="xmark" className="text-xs" />
              </Chip>
            ))}
          </div>
        ) : (
          <span className="text-xs text-fg-subtle">{t("languagesNone")}</span>
        )}
        <Input
          type="search"
          value={query}
          placeholder={t("languageSearch")}
          aria-label={t("languageSearch")}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }
            // Enter would otherwise submit the whole link form.
            event.preventDefault();
            const only = matches.length === 1 ? matches[0] : undefined;
            const pick = customCode ?? only?.code;
            if (pick && !values.includes(pick)) {
              onChange([...values, pick]);
              setQuery("");
            }
          }}
        />
        <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
          {matches.map((option) => (
            <Chip
              key={option.code}
              active={values.includes(option.code)}
              onClick={() => toggle(option.code)}
            >
              {option.name}
              <span className="font-mono text-xs text-fg-subtle">{option.code}</span>
            </Chip>
          ))}
          {customCode ? (
            <Chip
              onClick={() => {
                onChange([...values, customCode]);
                setQuery("");
              }}
            >
              <Icon name="plus" className="text-xs" />
              {t("languageAddCode", { code: customCode })}
            </Chip>
          ) : null}
          {matches.length === 0 && !customCode ? (
            <span className="text-sm text-fg-muted">{t("languageNoMatch")}</span>
          ) : null}
        </div>
      </div>
    </FieldGroup>
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
    <div className="flex flex-col gap-3 rounded-md border border-border-subtle bg-surface-subtle p-4">
      <div className="flex items-end gap-2">
        <Field label={t("when")} info={t("info.when")} className="flex-1">
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
          <Field
            label={t("operator")}
            info={condition.type === "referrer" ? t("info.referrerOperator") : t("info.operator")}
            className="w-40"
          >
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
          info={t("info.countries")}
          hint={t("countriesHint")}
          values={condition.values}
          onChange={(values) => onChange({ ...condition, values })}
        />
      ) : null}

      {condition.type === "continent" ? (
        <TokenList
          label={t("continents")}
          info={t("info.continents")}
          hint={t("continentsHint")}
          values={condition.values}
          onChange={(values) => onChange({ ...condition, values })}
        />
      ) : null}

      {condition.type === "region" ? (
        <TokenList
          label={t("regions")}
          info={t("info.regions")}
          hint={t("regionsHint")}
          values={condition.values}
          onChange={(values) => onChange({ ...condition, values })}
        />
      ) : null}

      {condition.type === "language" ? (
        <LanguagePicker
          values={condition.values}
          onChange={(values) => onChange({ ...condition, values })}
        />
      ) : null}

      {condition.type === "device" ? (
        <FieldGroup label={t("devices")} info={t("info.devices")}>
          <OptionChips
            options={DEVICE_VALUES}
            values={condition.values}
            formatOption={(option) => deviceLabel(option, t)}
            onChange={(values) =>
              onChange({ ...condition, values: values as typeof condition.values })
            }
          />
        </FieldGroup>
      ) : null}

      {condition.type === "os" ? (
        <FieldGroup label={t("operatingSystems")} info={t("info.operatingSystems")}>
          <OptionChips
            options={OS_VALUES}
            values={condition.values}
            formatOption={(option) => clientLabel(OS_LABELS, option, t)}
            onChange={(values) => onChange({ ...condition, values })}
          />
        </FieldGroup>
      ) : null}

      {condition.type === "browser" ? (
        <>
          <FieldGroup label={t("browsers")} info={t("info.browsers")}>
            <OptionChips
              options={BROWSER_VALUES}
              values={condition.values}
              formatOption={(option) => clientLabel(BROWSER_LABELS, option, t)}
              onChange={(values) => onChange({ ...condition, values })}
            />
          </FieldGroup>
          {/* Same value list: each group only toggles its own options. */}
          <FieldGroup label={t("inAppBrowsers")} info={t("info.inAppBrowsers")}>
            <OptionChips
              options={IN_APP_VALUES}
              values={condition.values}
              formatOption={(option) => clientLabel(BROWSER_LABELS, option, t)}
              onChange={(values) => onChange({ ...condition, values })}
            />
          </FieldGroup>
        </>
      ) : null}

      {condition.type === "referrer" && condition.op !== "empty" && condition.op !== "not_empty" ? (
        <Field label={t("value")} info={t("info.referrerValue")} hint={t("valueHint")}>
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
            <Field label={t("from")} info={t("info.from")} className="w-28">
              <Input
                type="time"
                value={condition.from}
                onChange={(event) => onChange({ ...condition, from: event.target.value })}
              />
            </Field>
            <Field label={t("to")} info={t("info.to")} className="w-28">
              <Input
                type="time"
                value={condition.to}
                onChange={(event) => onChange({ ...condition, to: event.target.value })}
              />
            </Field>
            <Field
              label={t("timezone")}
              info={t("info.timezone")}
              className="flex-1"
              hint={t("timezoneHint")}
            >
              <Input
                value={condition.timezone}
                onChange={(event) => onChange({ ...condition, timezone: event.target.value })}
              />
            </Field>
          </div>
          <FieldGroup label={t("days")} info={t("info.days")}>
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
          </FieldGroup>
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
  const locale = useLocale();

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
        icon="sliders"
        eyebrow={t("paywallEyebrow")}
        title={t("paywallTitle")}
        description={t("paywallBody")}
        actions={
          <Button variant="primary" leadingIcon="rocket" href="/billing">
            {t("seePlans")}
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Callout tone="info">{t("rulesIntro")}</Callout>

      {rules.length === 0 ? (
        <EmptyState
          size="sm"
          tone="first-run"
          icon="sliders"
          title={t("noRulesTitle")}
          description={t("noRulesBody")}
          actions={
            <Button variant="primary" leadingIcon="plus" onClick={addRule}>
              {t("addRule")}
            </Button>
          }
        />
      ) : null}

      {rules.map((rule, index) => (
        <Card key={rule.id} className="gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Badge tone="accent" className="w-fit">
                {t("form.ruleNumber", { n: index + 1 })}
              </Badge>
              {rule.conditions.length > 0 ? (
                <span className="text-[13px] leading-5 text-fg-muted">
                  {describeRuleConditions(rule, t, locale)}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Field label={t("priority")} info={t("info.priority")} className="w-24">
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
              variant="ghost"
              leadingIcon="plus"
              className="w-fit"
              onClick={() =>
                patchRule(index, { conditions: [...rule.conditions, newCondition("device")] })
              }
            >
              {t("addCondition")}
            </Button>
          </div>

          <Field label={t("sendTo")} info={t("info.sendTo")}>
            <Input
              value={rule.destination}
              placeholder={t("ruleDestinationPlaceholder")}
              onChange={(event) => patchRule(index, { destination: event.target.value })}
            />
          </Field>
        </Card>
      ))}

      {rules.length > 0 ? (
        <Button leadingIcon="plus" className="w-fit" onClick={addRule}>
          {t("addRule")}
        </Button>
      ) : null}
    </div>
  );
}

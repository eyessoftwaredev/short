"use client";

import { Icon } from "@/components/kit/icon";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { cn } from "@/lib/cx";

type PasswordFieldProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  name?: string;
  minLength?: number;
  /** Sign-up only: states the rule up front and rates the rest as advice. */
  requirements?: boolean;
  invalid?: boolean;
};

const STRENGTH = [
  { key: "passwordTooShort", bar: "bg-border-strong", text: "text-fg-subtle" },
  { key: "passwordWeak", bar: "bg-danger", text: "text-danger" },
  { key: "passwordFair", bar: "bg-warn", text: "text-warn-ink" },
  { key: "passwordStrong", bar: "bg-accent", text: "text-accent-ink" },
] as const;

function scorePassword(value: string, min: number): number {
  if (value.length === 0) {
    return 0;
  }
  const signals = [
    value.length >= min,
    /[a-zA-Z]/.test(value) && /\d/.test(value),
    value.length >= 14 || /[^A-Za-z0-9]/.test(value),
  ];
  return signals.filter(Boolean).length;
}

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  name = "password",
  minLength,
  requirements = false,
  invalid = false,
}: PasswordFieldProps) {
  const t = useTranslations("auth");
  const resolvedLabel = label ?? t("passwordLabel");
  const [visible, setVisible] = useState(false);
  const describedBy = useId();

  const min = minLength ?? 0;
  const longEnough = value.length >= min;
  const score = scorePassword(value, min);
  const strength = STRENGTH[score] ?? STRENGTH[0];

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Field label={resolvedLabel}>
        <span className="relative flex min-w-0 items-center">
          <Input
            type={visible ? "text" : "password"}
            name={name}
            autoComplete={autoComplete}
            required
            minLength={minLength}
            aria-invalid={invalid || undefined}
            aria-describedby={requirements ? describedBy : undefined}
            className="pr-11"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
          <span className="absolute top-1/2 right-1 flex -translate-y-1/2 items-center">
            <Button
              variant="ghost"
              icon
              aria-label={visible ? t("hidePassword") : t("showPassword")}
              aria-pressed={visible}
              onClick={() => setVisible((prev) => !prev)}
            >
              {visible ? (
                <Icon name="eye-slash" className="text-sm text-fg-muted" aria-hidden="true" />
              ) : (
                <Icon name="eye" className="text-sm text-fg-muted" aria-hidden="true" />
              )}
            </Button>
          </span>
        </span>
      </Field>

      {requirements ? (
        <div id={describedBy} className="flex min-w-0 flex-col gap-2">
          <p
            className={cn(
              "m-0 flex items-center gap-1.5 text-xs",
              longEnough ? "text-accent-ink" : "text-fg-subtle",
            )}
          >
            {longEnough ? (
              <Icon name="check" className="text-xs shrink-0" aria-hidden="true" />
            ) : (
              <Icon name="minus" className="text-xs shrink-0" aria-hidden="true" />
            )}
            {t("passwordRequired", { min: minLength ?? min })}
          </p>

          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex flex-1 gap-1" aria-hidden="true">
              {[1, 2, 3].map((step) => (
                <span
                  key={step}
                  className={cn(
                    "h-1 flex-1 rounded-pill transition-colors duration-200",
                    score >= step ? strength.bar : "bg-surface",
                  )}
                />
              ))}
            </span>
            <span
              className={cn("shrink-0 font-mono text-xs tabular-nums", strength.text)}
              aria-live="polite"
            >
              {value.length === 0 ? "—" : t(strength.key)}
            </span>
          </div>

          <p className="m-0 text-xs text-fg-subtle">
            {t("passwordMixHint")}
          </p>
        </div>
      ) : null}
    </div>
  );
}

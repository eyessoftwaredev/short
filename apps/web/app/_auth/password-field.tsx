"use client";

import { Icon } from "@/components/kit/icon";

import { useTranslations } from "next-intl";
import { useId, useState, type KeyboardEvent } from "react";
import { Field, Input } from "@/components/ui";
import { cn } from "@/lib/cx";

type PasswordFieldProps = {
  label?: string;
  /** Tooltip next to the label, e.g. the password policy on sign-up and reset. */
  info?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  name?: string;
  minLength?: number;
  /** Sign-up only: states the rule up front and rates the rest as advice. */
  requirements?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
};

const STRENGTH = [
  { key: "passwordTooShort", bar: "bg-border-strong", text: "text-fg-subtle" },
  { key: "passwordWeak", bar: "bg-danger", text: "text-danger" },
  { key: "passwordFair", bar: "bg-warn", text: "text-warn-ink" },
  { key: "passwordStrong", bar: "bg-success", text: "text-success-ink" },
] as const;

function signalsFor(value: string, min: number): [boolean, boolean, boolean] {
  return [
    value.length >= min,
    /[a-zA-Z]/.test(value) && /\d/.test(value),
    value.length >= 14 || /[^A-Za-z0-9]/.test(value),
  ];
}

export function PasswordField({
  label,
  info,
  value,
  onChange,
  autoComplete,
  name = "password",
  minLength,
  requirements = false,
  invalid = false,
  autoFocus = false,
}: PasswordFieldProps) {
  const t = useTranslations("auth");
  const resolvedLabel = label ?? t("passwordLabel");
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const describedBy = useId();

  const min = minLength ?? 0;
  const signals = signalsFor(value, min);
  // The length rule is the only hard requirement; without it the rest does not count.
  const score = value.length === 0 ? 0 : signals[0] ? signals.filter(Boolean).length : 1;
  const strength = STRENGTH[score] ?? STRENGTH[0];

  const trackCaps = (event: KeyboardEvent<HTMLInputElement>): void => {
    setCapsLock(event.getModifierState?.("CapsLock") ?? false);
  };

  const checks = [
    { id: "length", ok: signals[0], label: t("passwordRequired", { min }) },
    { id: "mix", ok: signals[1], label: t("passwordCheckMix") },
    { id: "extra", ok: signals[2], label: t("passwordCheckExtra") },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <Field label={resolvedLabel} info={info}>
        <Input
          type={visible ? "text" : "password"}
          name={name}
          autoComplete={autoComplete}
          required
          autoFocus={autoFocus}
          minLength={minLength}
          aria-invalid={invalid || undefined}
          aria-describedby={requirements ? describedBy : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={trackCaps}
          onKeyUp={trackCaps}
          onBlur={() => setCapsLock(false)}
          wrapperClassName="pr-1"
          suffix={
            <button
              type="button"
              aria-label={visible ? t("hidePassword") : t("showPassword")}
              aria-pressed={visible}
              title={visible ? t("hidePassword") : t("showPassword")}
              onClick={(event) => {
                // Keep the click from focusing the label target twice on Safari.
                event.preventDefault();
                setVisible((prev) => !prev);
              }}
              className="pointer-events-auto flex size-8 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:bg-surface hover:text-ink"
            >
              <Icon name={visible ? "eye-slash" : "eye"} className="text-sm" />
            </button>
          }
        />
      </Field>

      {capsLock ? (
        <p className="m-0 flex items-center gap-1.5 text-xs text-warn-ink" role="status">
          <Icon name="warning" className="text-[11px]" />
          {t("capsLockOn")}
        </p>
      ) : null}

      {requirements ? (
        <div id={describedBy} className="flex min-w-0 flex-col gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex flex-1 gap-1" aria-hidden="true">
              {[1, 2, 3].map((step) => (
                <span
                  key={step}
                  className={cn(
                    "h-1 flex-1 rounded-pill transition-colors duration-200",
                    score >= step ? strength.bar : "bg-surface-strong",
                  )}
                />
              ))}
            </span>
            <span className={cn("w-16 shrink-0 text-right text-xs font-medium", strength.text)} aria-live="polite">
              {value.length === 0 ? "" : t(strength.key)}
            </span>
          </div>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {checks.map((check) => (
              <li
                key={check.id}
                className={cn(
                  "flex items-center gap-1.5 text-xs transition-colors",
                  check.ok ? "text-success-ink" : "text-fg-subtle",
                )}
              >
                <Icon name={check.ok ? "circle-check" : "minus"} className="text-[11px]" />
                {check.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

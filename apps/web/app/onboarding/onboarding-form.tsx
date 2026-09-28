"use client";

import { Icon, type IconName } from "@/components/kit/icon";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Avatar, Button, Callout, Card, Chip, Field, Input } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { useActionMessage } from "@/lib/action-message";
import { cn } from "@/lib/cx";
import { createFirstWorkspace, type OnboardingIntent } from "./actions";

const MIN_NAME = 2;
const MAX_NAME = 64;

const INTENTS: ReadonlyArray<{ id: OnboardingIntent; icon: IconName }> = [
  { id: "link", icon: "link" },
  { id: "qr", icon: "qrcode" },
  { id: "bio", icon: "address-card" },
  { id: "dashboard", icon: "gauge-high" },
];

function initialsOf(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "W";
  }
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

export function OnboardingForm({ suggestion }: { suggestion: string }) {
  const router = useRouter();
  const t = useTranslations("onboarding");
  const actionMessage = useActionMessage();
  const [name, setName] = useState(suggestion);
  const [intent, setIntent] = useState<OnboardingIntent>("link");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const trimmed = name.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_NAME;
  const presets = [suggestion, t("personal"), t("marketing")].filter(
    (preset, index, all) => preset.length > 0 && all.indexOf(preset) === index,
  );

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (trimmed.length < MIN_NAME) {
      setError(t("hint", { min: MIN_NAME, max: MAX_NAME }));
      return;
    }
    setPending(true);
    setError(null);

    try {
      const result = await createFirstWorkspace(name, intent);
      if (!result.ok) {
        setError(actionMessage(result.error));
        return;
      }
      router.push(result.data.href);
      router.refresh();
    } catch {
      setError(actionMessage("generic"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="flex min-w-0 flex-col gap-6"
      aria-busy={pending}
      onSubmit={(event) => {
        void submit(event);
      }}
    >
      <Card padding="lg" title={t("nameCardTitle")} description={t("nameCardDesc")}>
        <div className="flex min-w-0 flex-col gap-5">
          {error ? <Callout tone="danger">{error}</Callout> : null}

          <Field
            label={t("nameLabel")}
            info={t("nameInfo")}
            hint={t("hint", { min: MIN_NAME, max: MAX_NAME })}
            error={tooShort ? t("hint", { min: MIN_NAME, max: MAX_NAME }) : undefined}
          >
            <Input
              name="name"
              required
              autoFocus
              minLength={MIN_NAME}
              maxLength={MAX_NAME}
              placeholder={t("namePlaceholder")}
              aria-invalid={error || tooShort ? true : undefined}
              value={name}
              onChange={(event) => setName(event.target.value)}
              suffix={
                <span className="numeric text-xs text-fg-subtle">
                  {trimmed.length}/{MAX_NAME}
                </span>
              }
            />
          </Field>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="shrink-0 text-xs text-fg-subtle">{t("try")}</span>
            {presets.map((preset) => (
              <Chip
                key={preset}
                active={trimmed === preset}
                onClick={() => setName(preset)}
                className="max-w-full"
              >
                <span className="min-w-0 truncate">{preset}</span>
              </Chip>
            ))}
          </div>

          <div className="flex min-w-0 items-center gap-3 rounded-md border border-border-subtle bg-surface-subtle p-3">
            <Avatar size="lg" aria-hidden="true">
              {initialsOf(name)}
            </Avatar>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-ink">
                {trimmed.length > 0 ? trimmed : t("yourWorkspace")}
              </span>
              <span className="truncate text-xs text-fg-subtle">{t("ownerFree")}</span>
            </span>
            <span className="ml-auto hidden text-xs text-fg-subtle sm:inline">{t("preview")}</span>
          </div>
        </div>
      </Card>

      <Card padding="lg" title={t("nextTitle")} description={t("nextDesc")}>
        <div role="radiogroup" aria-label={t("nextTitle")} className="grid min-w-0 gap-2.5 sm:grid-cols-2">
          {INTENTS.map((option) => {
            const selected = intent === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setIntent(option.id)}
                className={cn(
                  "flex min-w-0 items-start gap-3 rounded-md border p-3.5 text-left transition-colors",
                  selected
                    ? "border-accent bg-accent-tint ring-1 ring-accent"
                    : "border-border bg-bg hover:border-border-hover hover:bg-surface-subtle",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-default",
                    selected ? "bg-accent text-on-accent" : "bg-surface text-fg-muted",
                  )}
                  aria-hidden="true"
                >
                  <Icon name={option.icon} className="text-sm" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium text-ink">{t(`intent.${option.id}.title`)}</span>
                  <span className="text-[13px] leading-snug text-fg-muted">{t(`intent.${option.id}.body`)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-[13px] text-fg-subtle">{t("laterHint")}</p>
        <Button type="submit" variant="primary" size="lg" loading={pending} trailingIcon="arrow-right">
          {pending ? t("creating") : t("submit")}
        </Button>
      </div>
    </form>
  );
}

/** "Not you?" escape on the onboarding header. */
export function OnboardingSignOut({ label }: { label: string }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
      onClick={() => {
        setPending(true);
        void authClient
          .signOut()
          .catch(() => undefined)
          .finally(() => {
            window.location.assign("/login");
          });
      }}
    >
      {label}
    </Button>
  );
}

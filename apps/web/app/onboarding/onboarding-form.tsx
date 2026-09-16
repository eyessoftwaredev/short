"use client";

import { Icon } from "@/components/kit/icon";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Avatar, Button, Card, Chip, Field, Input } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { createFirstWorkspace } from "./actions";

const MIN_NAME = 2;
const MAX_NAME = 64;

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
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const trimmed = name.trim();
  const presets = [suggestion, t("personal"), t("marketing")].filter(
    (preset, index, all) => preset.length > 0 && all.indexOf(preset) === index,
  );

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const result = await createFirstWorkspace(name);
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
    <Card staticHover className="gap-5 p-6">
      <form
        className="flex min-w-0 flex-col gap-5"
        aria-busy={pending}
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        {error ? (
          <div
            role="alert"
            className="flex min-w-0 items-start gap-3 rounded-default border border-danger bg-danger-surface px-3.5 py-3"
          >
            <Icon name="warning" className="mt-0.5 text-sm shrink-0 text-danger" aria-hidden="true" />
            <p className="m-0 min-w-0 text-sm text-fg-muted">{error}</p>
          </div>
        ) : null}

        <Field label={t("nameLabel")}>
          <Input
            name="name"
            required
            autoFocus
            minLength={MIN_NAME}
            maxLength={MAX_NAME}
            placeholder={t("namePlaceholder")}
            aria-invalid={error ? true : undefined}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
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
          <span className="shrink-0 font-mono text-xs text-fg-subtle tabular-nums">
            {trimmed.length}/{MAX_NAME}
          </span>
        </div>

        <div className="flex min-w-0 flex-col gap-2 rounded-default border border-border bg-surface-subtle p-4">
          <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
            {t("preview")}
          </span>
          <span className="flex min-w-0 items-center gap-3">
            <Avatar size="lg" aria-hidden="true">
              {initialsOf(name)}
            </Avatar>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">
                {trimmed.length > 0 ? trimmed : t("yourWorkspace")}
              </span>
              <span className="truncate text-xs text-fg-subtle">{t("ownerFree")}</span>
            </span>
          </span>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={pending}
        >
          {pending ? t("creating") : t("submit")}
          {pending ? null : <Icon name="arrow-right" className="text-sm" aria-hidden="true" />}
        </Button>

        <p className="m-0 text-xs text-fg-subtle">
          {t("hint", { min: MIN_NAME, max: MAX_NAME })}
        </p>
      </form>
    </Card>
  );
}

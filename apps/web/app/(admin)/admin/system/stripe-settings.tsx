"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge, Button, Field, Input, Section } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import type { StripeStatus } from "@/lib/stripe";
import { clearStripeCredentialsAction, saveStripeCredentialsAction } from "./actions";

type StripeSettingsProps = {
  status: StripeStatus;
};

export function StripeSettings({ status }: StripeSettingsProps) {
  const router = useRouter();
  const t = useTranslations("admin.system");
  const actionMessage = useActionMessage();
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sourceLabel =
    status.source === "database"
      ? t("stripeSourceDb")
      : status.source === "env"
        ? t("stripeSourceEnv")
        : t("stripeMissing");
  const modeLabel =
    status.livemode === true ? t("stripeLive") : status.livemode === false ? t("stripeTest") : null;

  const save = (): void => {
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const result = await saveStripeCredentialsAction({
        secretKey,
        webhookSecret,
        publishableKey,
      });
      if (!result.ok) {
        setError(actionMessage(result.error));
        return;
      }
      setSecretKey("");
      setWebhookSecret("");
      setPublishableKey("");
      setNotice(t("stripeSaved"));
      router.refresh();
    });
  };

  const clear = (): void => {
    if (!window.confirm(t("stripeClearConfirm"))) {
      return;
    }
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const result = await clearStripeCredentialsAction();
      if (!result.ok) {
        setError(actionMessage(result.error));
        return;
      }
      setSecretKey("");
      setWebhookSecret("");
      setPublishableKey("");
      setNotice(t("stripeCleared"));
      router.refresh();
    });
  };

  return (
    <Section title={t("stripeTitle")} description={t("stripeDesc")}>
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge tone={status.configured ? "accent" : "muted"} dot>
            {sourceLabel}
          </Badge>
          {modeLabel ? (
            <Badge tone={status.livemode ? "accent" : "muted"}>{modeLabel}</Badge>
          ) : null}
        </div>

        {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}
        {notice ? <p className="m-0 text-sm text-accent-ink">{notice}</p> : null}

        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <Field label={t("stripeSecret")} hint={t("stripeSecretHint")}>
            <Input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={secretKey}
              onChange={(event) => setSecretKey(event.target.value)}
            />
          </Field>
          <Field label={t("stripeWebhook")} hint={t("stripeWebhookHint")}>
            <Input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={webhookSecret}
              onChange={(event) => setWebhookSecret(event.target.value)}
            />
          </Field>
        </div>

        <Field
          label={t("stripePublishable")}
          hint={
            status.publishableLast4
              ? t("stripePublishableSet", { last4: status.publishableLast4 })
              : t("stripePublishableHint")
          }
        >
          <Input
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={publishableKey}
            onChange={(event) => setPublishableKey(event.target.value)}
          />
        </Field>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button type="button" variant="primary" loading={pending} onClick={save}>
            {t("stripeSave")}
          </Button>
          {status.source === "database" ? (
            <Button type="button" variant="danger" disabled={pending} onClick={clear}>
              {t("stripeClear")}
            </Button>
          ) : null}
        </div>
      </div>
    </Section>
  );
}

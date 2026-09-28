"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Badge,
  Button,
  ConfirmDialog,
  SecretInput,
  SectionCard,
  SettingsRow,
  Input,
  toast,
} from "@/components/ui";
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
  const [confirmClear, setConfirmClear] = useState(false);
  const [saving, startSave] = useTransition();
  const [clearing, startClear] = useTransition();

  const sourceLabel =
    status.source === "database"
      ? t("stripeSourceDb")
      : status.source === "env"
        ? t("stripeSourceEnv")
        : t("stripeMissing");
  const modeLabel =
    status.livemode === true ? t("stripeLive") : status.livemode === false ? t("stripeTest") : null;
  // A first-time setup needs both secrets; after that, blank fields keep what is stored.
  const needsBoth = !status.configured || status.source !== "database";
  const canSave = needsBoth
    ? secretKey.trim() !== "" && webhookSecret.trim() !== ""
    : secretKey.trim() !== "" || webhookSecret.trim() !== "" || publishableKey.trim() !== "";

  function reset(): void {
    setSecretKey("");
    setWebhookSecret("");
    setPublishableKey("");
  }

  function save(): void {
    startSave(async () => {
      const result = await saveStripeCredentialsAction({ secretKey, webhookSecret, publishableKey });
      if (!result.ok) {
        toast.error(t("stripeSaveFailed"), actionMessage(result.error));
        return;
      }
      reset();
      toast.success(t("stripeSaved"));
      router.refresh();
    });
  }

  function clear(): void {
    startClear(async () => {
      const result = await clearStripeCredentialsAction();
      setConfirmClear(false);
      if (!result.ok) {
        toast.error(t("stripeSaveFailed"), actionMessage(result.error));
        return;
      }
      reset();
      toast.success(t("stripeCleared"));
      router.refresh();
    });
  }

  return (
    <>
      <SectionCard
        id="stripe"
        title={t("stripeTitle")}
        description={t("stripeDesc")}
        actions={
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge tone={status.configured ? "success" : "warn"} dot>
              {sourceLabel}
            </Badge>
            {modeLabel ? <Badge tone={status.livemode ? "accent" : "neutral"}>{modeLabel}</Badge> : null}
          </span>
        }
        footer={
          <>
            {status.source === "database" ? (
              <Button variant="ghost" className="mr-auto text-danger" onClick={() => setConfirmClear(true)} disabled={saving}>
                {t("stripeClear")}
              </Button>
            ) : null}
            <Button variant="primary" loading={saving} disabled={!canSave} onClick={save}>
              {t("stripeSave")}
            </Button>
          </>
        }
      >
        <SettingsRow
          label={t("stripeSecret")}
          description={t("stripeSecretHint")}
          info={t("stripeSecretInfo")}
          htmlFor="stripe-secret"
        >
          <SecretInput
            id="stripe-secret"
            domName="stripe-secret"
            spellCheck={false}
            className="font-mono"
            placeholder={status.source === "database" ? t("stripeKeepCurrent") : "sk_live_…"}
            value={secretKey}
            onChange={(event) => setSecretKey(event.target.value)}
          />
        </SettingsRow>
        <SettingsRow
          label={t("stripeWebhook")}
          description={t("stripeWebhookHint")}
          info={t("stripeWebhookInfo")}
          htmlFor="stripe-webhook"
        >
          <SecretInput
            id="stripe-webhook"
            domName="stripe-webhook"
            spellCheck={false}
            className="font-mono"
            placeholder={status.source === "database" ? t("stripeKeepCurrent") : "whsec_…"}
            value={webhookSecret}
            onChange={(event) => setWebhookSecret(event.target.value)}
          />
        </SettingsRow>
        <SettingsRow
          label={t("stripePublishable")}
          description={
            status.publishableLast4
              ? t("stripePublishableSet", { last4: status.publishableLast4 })
              : t("stripePublishableHint")
          }
          info={t("stripePublishableInfo")}
          htmlFor="stripe-publishable"
        >
          <Input
            id="stripe-publishable"
            type="text"
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            placeholder="pk_live_…"
            value={publishableKey}
            onChange={(event) => setPublishableKey(event.target.value)}
          />
        </SettingsRow>
      </SectionCard>

      <ConfirmDialog
        open={confirmClear}
        title={t("stripeClearTitle")}
        description={t("stripeClearConfirm")}
        confirmLabel={t("stripeClear")}
        loading={clearing}
        onConfirm={clear}
        onClose={() => setConfirmClear(false)}
      />
    </>
  );
}

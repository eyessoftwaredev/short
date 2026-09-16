"use client";

import { Icon } from "@/components/kit/icon";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Input } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { AuthAlert, AuthHeading } from "../_auth/auth-primitives";

export function ForgotForm() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setPending(true);

    try {
      await authClient.requestPasswordReset({ email, redirectTo: "/reset" });
    } catch {
      // Intentionally ignored: the response must not reveal whether the address exists.
    } finally {
      setPending(false);
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="flex min-w-0 flex-col gap-6">
        <span
          className="flex size-11 items-center justify-center rounded-default bg-accent-surface text-accent-ink"
          aria-hidden="true"
        >
          <Icon name="envelope-circle-check" className="text-lg" />
        </span>

        <AuthHeading title={t("forgotSentTitle")} description={t("forgotSentDescription")} />

        <div className="flex min-w-0 flex-col gap-1.5 rounded-default border border-border bg-surface-subtle px-4 py-3.5">
          <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
            {t("forgotRequestedFor")}
          </span>
          <span className="min-w-0 font-mono text-sm break-all text-ink">{email}</span>
        </div>

        <AuthAlert tone="info">{t("forgotBlind")}</AuthAlert>

        <div className="flex flex-wrap gap-2.5">
          <Button
            onClick={() => {
              setSent(false);
            }}
          >
            {t("forgotAnother")}
          </Button>
          <Button variant="ghost" href="/login">
            {t("verifyBackToSignIn")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AuthHeading title={t("forgotTitle")} description={t("forgotDescription")} />

      <form
        className="flex min-w-0 flex-col gap-4"
        aria-busy={pending}
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <Field label={t("email")} hint={t("forgotHint")}>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@acme.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
          {pending ? t("forgotSending") : t("forgotSubmit")}
        </Button>
      </form>

      <p className="m-0 text-sm text-fg-muted">{t("forgotSettingsHint")}</p>
    </>
  );
}

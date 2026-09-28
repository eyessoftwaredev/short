"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Input } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { AuthAlert, AuthHeading, AuthValue } from "../_auth/auth-primitives";

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
      <div className="flex min-w-0 flex-col gap-6" aria-live="polite">
        <AuthHeading icon="envelope-circle-check" title={t("forgotSentTitle")} description={t("forgotSentDescription")} />

        <AuthValue label={t("forgotRequestedFor")} value={email} />

        <AuthAlert tone="info">{t("forgotBlind")}</AuthAlert>

        <div className="flex flex-wrap gap-2.5">
          <Button
            leadingIcon="rotate-right"
            onClick={() => {
              setSent(false);
            }}
          >
            {t("forgotAnother")}
          </Button>
          <Button variant="ghost" href="/login" leadingIcon="arrow-left">
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
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            autoFocus
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Button type="submit" variant="primary" size="lg" block loading={pending}>
          {pending ? t("forgotSending") : t("forgotSubmit")}
        </Button>
      </form>

      <p className="m-0 text-[13px] leading-relaxed text-fg-subtle">{t("forgotSettingsHint")}</p>
    </>
  );
}

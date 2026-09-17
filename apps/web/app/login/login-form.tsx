"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/kit/icon";
import { Button, Field, Input } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { isTwoFactorRedirect, twoFactorContinueHref } from "@/lib/two-factor";
import { verifyPendingPath } from "@/lib/verify-path";
import { grantVerifyResend } from "../verify/actions";
import { useTranslations } from "next-intl";
import { AuthAlert, AuthDivider, AuthHeading } from "../_auth/auth-primitives";
import { PasswordField } from "../_auth/password-field";

function isUnverifiedLogin(error: { status?: number; code?: string; message?: string | null }): boolean {
  const code = (error.code ?? "").toUpperCase();
  if (code === "EMAIL_NOT_VERIFIED") {
    return true;
  }
  const message = (error.message ?? "").toLowerCase();
  if (message.includes("verif")) {
    return true;
  }
  return error.status === 403;
}

export function LoginForm() {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const returnedFrom = next !== "/dashboard" ? next : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const result = await authClient.signIn.email({ email, password, callbackURL: next });
      if (result.error) {
        if (isUnverifiedLogin(result.error)) {
          await grantVerifyResend(email, password);
          router.push(verifyPendingPath());
          return;
        }
        setError(result.error.message ?? t("signInFailed"));
        return;
      }
      if (isTwoFactorRedirect(result.data)) {
        window.location.assign(twoFactorContinueHref());
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError(te("generic"));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <AuthHeading title={t("loginTitle")} description={t("loginDescription")} />

      {returnedFrom ? (
        <AuthAlert tone="info">
          {t("continueTo", { path: returnedFrom })}
        </AuthAlert>
      ) : null}

      {error ? (
        <AuthAlert tone="danger" title={t("signInFailedTitle")}>
          {error}
        </AuthAlert>
      ) : null}

      <form
        className="flex min-w-0 flex-col gap-4"
        noValidate={false}
        aria-busy={pending}
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <Field label={t("email")}>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder={t("emailPlaceholder")}
            aria-invalid={error ? true : undefined}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <div className="flex min-w-0 flex-col gap-1.5">
          <PasswordField
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            invalid={Boolean(error)}
          />
          <Link href="/forgot" className="self-end text-xs font-medium">
            {t("forgotPassword")}
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
          {pending ? t("signingIn") : t("signIn")}
        </Button>
      </form>

      <AuthDivider label={t("or")} />

      <Button
        size="lg"
        className="w-full"
        disabled
        title={t("googleUnavailable")}
      >
        <Icon name="google" className="text-sm" />
        {t("continueGoogle")}
      </Button>
    </>
  );
}

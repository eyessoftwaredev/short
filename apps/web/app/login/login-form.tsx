"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Field, Input } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { isTwoFactorRedirect, safeInternalPath, twoFactorContinueHref } from "@/lib/two-factor";
import { verifyPendingPath } from "@/lib/verify-path";
import { grantVerifyResend } from "../verify/actions";
import { useTranslations } from "next-intl";
import { authErrorMessage } from "../_auth/auth-errors";
import { AuthAlert, AuthDivider, AuthHeading } from "../_auth/auth-primitives";
import { PasswordField } from "../_auth/password-field";

function isUnverifiedLogin(error: { status?: number; code?: string; message?: string | null }): boolean {
  const code = (error.code ?? "").toUpperCase();
  if (code === "EMAIL_NOT_VERIFIED") {
    return true;
  }
  // A banned account is also a 403; it must see the ban message, not the verify screen.
  if (code !== "") {
    return false;
  }
  return (error.message ?? "").toLowerCase().includes("verif");
}

export function LoginForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const router = useRouter();
  const params = useSearchParams();
  const next = safeInternalPath(params.get("next"));
  const returnedFrom = next !== "/dashboard" ? next : null;
  const deletionScheduled = params.get("notice") === "deletion-scheduled";
  const passwordReset = params.get("notice") === "password-reset";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

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
        setError(authErrorMessage(result.error, t, t("signInFailed")));
        return;
      }
      if (isTwoFactorRedirect(result.data)) {
        window.location.assign(twoFactorContinueHref());
        return;
      }
      // Full navigation so Set-Cookie is committed before middleware reads the session.
      window.location.assign(next);
    } catch {
      setError(te("generic"));
    } finally {
      setPending(false);
    }
  };

  const handleGoogle = async (): Promise<void> => {
    setGooglePending(true);
    setError(null);
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL: next });
      if (result.error) {
        setError(authErrorMessage(result.error, t, t("signInFailed")));
        setGooglePending(false);
      }
    } catch {
      setError(te("generic"));
      setGooglePending(false);
    }
  };

  return (
    <>
      <AuthHeading title={t("loginTitle")} description={t("loginDescription")} />

      {deletionScheduled ? <AuthAlert tone="info">{t("deletionScheduledNotice")}</AuthAlert> : null}

      {passwordReset && !error ? <AuthAlert tone="accent">{t("resetDoneNotice")}</AuthAlert> : null}

      {returnedFrom ? <AuthAlert tone="info">{t("continueTo", { path: returnedFrom })}</AuthAlert> : null}

      {error ? (
        <AuthAlert tone="danger" title={t("signInFailedTitle")}>
          {error}
        </AuthAlert>
      ) : null}

      <form
        className="flex min-w-0 flex-col gap-4"
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
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            autoFocus
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
          <Link href="/forgot" className="self-end text-[13px] font-medium">
            {t("forgotPassword")}
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" block loading={pending} disabled={googlePending}>
          {pending ? t("signingIn") : t("signIn")}
        </Button>
      </form>

      {googleEnabled ? (
        <>
          <AuthDivider label={t("or")} />
          <Button
            size="lg"
            block
            leadingIcon="google"
            loading={googlePending}
            disabled={pending}
            onClick={() => {
              void handleGoogle();
            }}
          >
            {googlePending ? t("redirectingGoogle") : t("continueGoogle")}
          </Button>
        </>
      ) : null}

      {/* The header carries the same cross-link from `sm` up. */}
      <p className="m-0 text-center text-sm text-fg-muted sm:hidden">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-medium">
          {t("createOne")}
        </Link>
      </p>
    </>
  );
}

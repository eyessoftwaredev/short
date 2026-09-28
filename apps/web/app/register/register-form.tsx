"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Field, Input } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { verifyPendingPath } from "@/lib/verify-path";
import { grantVerifyResend } from "../verify/actions";
import { useTranslations } from "next-intl";
import { authErrorMessage } from "../_auth/auth-errors";
import { AuthAlert, AuthHeading } from "../_auth/auth-primitives";
import { PasswordField } from "../_auth/password-field";

const MIN_PASSWORD_LENGTH = 10;

export function RegisterForm({ inviteId = "" }: { inviteId?: string }) {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const router = useRouter();
  const loginHref =
    inviteId === "" ? "/login" : `/login?next=${encodeURIComponent(`/invite/${inviteId}`)}`;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t("passwordMin", { min: MIN_PASSWORD_LENGTH }));
      return;
    }

    setPending(true);
    setError(null);

    try {
      // Without a callback the verification link lands on the marketing home page.
      const result = await authClient.signUp.email({ name, email, password, callbackURL: "/dashboard" });
      if (result.error) {
        setError(authErrorMessage(result.error, t, t("signUpFailed"), { minPassword: MIN_PASSWORD_LENGTH }));
        return;
      }
      await grantVerifyResend(email, password);
      router.push(verifyPendingPath(inviteId));
    } catch {
      setError(te("generic"));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <AuthHeading title={t("registerTitle")} description={t("registerDescription")} />

      {error ? (
        <AuthAlert tone="danger" title={t("signUpFailedTitle")}>
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
        <Field label={t("name")}>
          <Input
            name="name"
            autoComplete="name"
            required
            autoFocus
            maxLength={120}
            placeholder={t("namePlaceholder")}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <Field label={t("workEmail")} info={t("workEmailInfo")}>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <PasswordField
          info={t("passwordPolicyInfo")}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          requirements
          invalid={Boolean(error)}
        />

        <Button type="submit" variant="primary" size="lg" block loading={pending}>
          {pending ? t("creatingWorkspace") : t("createAccount")}
        </Button>

        <p className="m-0 text-xs leading-relaxed text-fg-subtle">
          {t.rich("registerTerms", {
            terms: (chunks) => (
              <Link href="/terms" className="font-medium">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/privacy" className="font-medium">
                {chunks}
              </Link>
            ),
          })}{" "}
          {t("verifyHint")}
        </p>
      </form>

      {/* The header carries the same cross-link from `sm` up. */}
      <p className="m-0 text-center text-sm text-fg-muted sm:hidden">
        {t("alreadyHaveAccount")}{" "}
        <Link href={loginHref} className="font-medium">
          {t("signInInstead")}
        </Link>
      </p>
    </>
  );
}

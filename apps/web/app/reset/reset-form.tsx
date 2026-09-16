"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { AuthAlert, AuthHeading } from "../_auth/auth-primitives";
import { PasswordField } from "../_auth/password-field";

const MIN_PASSWORD_LENGTH = 10;

export function ResetForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t("resetTooShort", { min: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (token === "") {
      setError(t("resetMissingToken"));
      return;
    }

    setPending(true);
    setError(null);

    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) {
        setError(result.error.message ?? t("resetFailed"));
        return;
      }
      router.push("/login");
    } catch {
      setError(te("generic"));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <AuthHeading title={t("resetTitle")} description={t("resetDescription")} />

      {error ? (
        <AuthAlert tone="danger" title={t("resetErrorTitle")}>
          {error}
        </AuthAlert>
      ) : null}

      {token === "" ? (
        <AuthAlert tone="info">
          {t("resetOpenInbox")}{" "}
          <Link href="/forgot" className="font-medium">
            {t("resetRequestNew")}
          </Link>
        </AuthAlert>
      ) : null}

      <form
        className="flex min-w-0 flex-col gap-4"
        aria-busy={pending}
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <PasswordField
          label={t("resetNewPassword")}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          requirements
          invalid={Boolean(error)}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={pending || token === ""}
        >
          {pending ? t("resetUpdating") : t("resetSubmit")}
        </Button>
      </form>
    </>
  );
}

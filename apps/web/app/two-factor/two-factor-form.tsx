"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Input, Switch } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { safeInternalPath } from "@/lib/two-factor";
import { AuthAlert, AuthHeading } from "../_auth/auth-primitives";

export function TwoFactorForm() {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const params = useSearchParams();
  const next = safeInternalPath(params.get("next"));

  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const [useBackup, setUseBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const result = useBackup
        ? await authClient.twoFactor.verifyBackupCode({ code: code.trim(), trustDevice })
        : await authClient.twoFactor.verifyTotp({ code: code.trim(), trustDevice });

      if (result.error) {
        setError(result.error.message ?? t("twoFactorFailed"));
        return;
      }

      window.location.assign(next);
    } catch {
      setError(te("generic"));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <AuthHeading title={t("twoFactorTitle")} description={t("twoFactorDescription")} />

      {error ? (
        <AuthAlert tone="danger" title={t("twoFactorFailedTitle")}>
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
        <Field label={useBackup ? t("twoFactorBackup") : t("twoFactorCode")}>
          <Input
            name="code"
            inputMode={useBackup ? "text" : "numeric"}
            autoComplete={useBackup ? "off" : "one-time-code"}
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </Field>

        <label className="flex min-w-0 items-center gap-3 text-sm">
          <Switch checked={trustDevice} onCheckedChange={setTrustDevice} />
          <span className="min-w-0">{t("twoFactorTrustDevice")}</span>
        </label>

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending || code.trim() === ""}>
          {pending ? t("twoFactorVerifying") : t("twoFactorVerify")}
        </Button>
      </form>

      <button
        type="button"
        className="self-start text-xs font-medium"
        onClick={() => {
          setUseBackup((prev) => !prev);
          setCode("");
          setError(null);
        }}
      >
        {useBackup ? t("twoFactorUseApp") : t("twoFactorUseBackup")}
      </button>

      <Link href="/login" className="self-start text-xs font-medium">
        {t("verifyBackToSignIn")}
      </Link>
    </>
  );
}

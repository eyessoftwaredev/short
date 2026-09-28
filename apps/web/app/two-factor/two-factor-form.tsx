"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, InfoTip, Input, Switch } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { safeInternalPath } from "@/lib/two-factor";
import { authErrorMessage } from "../_auth/auth-errors";
import { AuthAlert, AuthHeading } from "../_auth/auth-primitives";

export function TwoFactorForm() {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const params = useSearchParams();
  const next = safeInternalPath(params.get("next"));
  const inputRef = useRef<HTMLInputElement>(null);

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
        setError(authErrorMessage(result.error, t, t("twoFactorFailed")));
        setCode("");
        inputRef.current?.focus();
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
      <AuthHeading
        icon="shield"
        title={t("twoFactorTitle")}
        description={useBackup ? t("twoFactorBackupDescription") : t("twoFactorDescription")}
      />

      {error ? (
        <AuthAlert tone="danger" title={t("twoFactorFailedTitle")}>
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
        <Field
          label={useBackup ? t("twoFactorBackup") : t("twoFactorCode")}
          info={useBackup ? t("twoFactorBackupInfo") : t("twoFactorCodeInfo")}
        >
          <Input
            ref={inputRef}
            name="code"
            inputMode={useBackup ? "text" : "numeric"}
            autoComplete={useBackup ? "off" : "one-time-code"}
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            required
            maxLength={useBackup ? 64 : 6}
            pattern={useBackup ? undefined : "[0-9]{6}"}
            placeholder={useBackup ? "xxxxx-xxxxx" : "000000"}
            className="h-12 text-center font-mono text-xl tracking-[0.4em] placeholder:tracking-[0.4em]"
            value={code}
            onChange={(event) =>
              setCode(useBackup ? event.target.value : event.target.value.replace(/\D/g, "").slice(0, 6))
            }
          />
        </Field>

        <label className="flex min-w-0 cursor-pointer items-center gap-3 text-sm">
          <Switch checked={trustDevice} onCheckedChange={setTrustDevice} />
          <span className="min-w-0 text-ink">{t("twoFactorTrustDevice")}</span>
          <InfoTip inline label={t("twoFactorTrustDevice")}>
            {t("twoFactorTrustDeviceInfo")}
          </InfoTip>
        </label>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          block
          loading={pending}
          disabled={code.trim() === ""}
        >
          {pending ? t("twoFactorVerifying") : t("twoFactorVerify")}
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-4">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon={useBackup ? "mobile-screen" : "key"}
          onClick={() => {
            setUseBackup((prev) => !prev);
            setCode("");
            setError(null);
            window.setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          {useBackup ? t("twoFactorUseApp") : t("twoFactorUseBackup")}
        </Button>
        <Button variant="ghost" size="sm" href="/login" leadingIcon="arrow-left">
          {t("verifyBackToSignIn")}
        </Button>
      </div>
    </>
  );
}

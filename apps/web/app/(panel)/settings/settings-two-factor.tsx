"use client";

import { Icon } from "@/components/kit/icon";
import { Badge, Button, Card, CopyButton, Field, Input } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cx";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import QRCode from "qrcode";

type SetupStep = "password" | "scan" | "verify";

async function totpQrDataUri(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, { width: 168, margin: 1, errorCorrectionLevel: "M" });
}

function totpSecretFromUri(uri: string): string | null {
  const match = /[?&]secret=([^&]+)/i.exec(uri);
  if (!match?.[1]) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

export function SettingsTwoFactor({
  twoFactorEnabled,
  embedded = false,
}: {
  twoFactorEnabled: boolean;
  embedded?: boolean;
}) {
  const t = useTranslations("settings");
  const te = useTranslations("errors");
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>("password");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function fail(message?: string | null): void {
    setError(message && message.trim() !== "" ? message : te("generic"));
    setNotice(null);
  }

  function resetSetup(): void {
    setStep("password");
    setQr(null);
    setSecret(null);
    setTotp("");
    setError(null);
  }

  function beginEnable(): void {
    start(async () => {
      setError(null);
      setNotice(null);
      if (password === "") {
        fail(t("twoFactorNeedPassword"));
        return;
      }
      try {
        const result = await authClient.twoFactor.enable({
          password,
          method: "totp",
        });
        if (result.error) {
          fail(result.error.message);
          return;
        }
        const totpURI =
          result.data && "totpURI" in result.data && typeof result.data.totpURI === "string"
            ? result.data.totpURI
            : null;
        if (!totpURI) {
          fail(te("generic"));
          return;
        }
        setQr(await totpQrDataUri(totpURI));
        setSecret(totpSecretFromUri(totpURI));
        if (result.data && "backupCodes" in result.data) {
          setBackupCodes(stringList(result.data.backupCodes));
        }
        setStep("scan");
      } catch {
        fail(te("generic"));
      }
    });
  }

  function confirmTotp(): void {
    start(async () => {
      setError(null);
      try {
        const result = await authClient.twoFactor.verifyTotp({ code: totp });
        if (result.error) {
          fail(result.error.message);
          return;
        }
        setTotp("");
        setQr(null);
        setSecret(null);
        setStep("password");
        setNotice(t("twoFactorVerified"));
        router.refresh();
      } catch {
        fail(te("generic"));
      }
    });
  }

  function refreshBackupCodes(): void {
    start(async () => {
      setError(null);
      setNotice(null);
      if (password === "") {
        fail(t("twoFactorNeedPassword"));
        return;
      }
      try {
        const result = await authClient.twoFactor.generateBackupCodes({ password });
        if (result.error) {
          fail(result.error.message);
          return;
        }
        const codes =
          result.data && "backupCodes" in result.data
            ? stringList(result.data.backupCodes)
            : [];
        setBackupCodes(codes);
        setNotice(t("backupCodesGenerated"));
      } catch {
        fail(te("generic"));
      }
    });
  }

  function turnOff(): void {
    start(async () => {
      setError(null);
      setNotice(null);
      if (password === "") {
        fail(t("twoFactorNeedPassword"));
        return;
      }
      try {
        const result = await authClient.twoFactor.disable({ password });
        if (result.error) {
          fail(result.error.message);
          return;
        }
        setBackupCodes([]);
        setPassword("");
        resetSetup();
        setNotice(t("twoFactorDisabledNotice"));
        router.refresh();
      } catch {
        fail(te("generic"));
      }
    });
  }

  const body = (
    <div className={cn("flex min-w-0 flex-col gap-4", embedded && "border-t border-border pt-5")}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <Icon name="shield" className="text-fg-subtle" />
          <span className="min-w-0 truncate">{t("twoFactor")}</span>
        </span>
        <Badge tone={twoFactorEnabled ? "accent" : "muted"} dot>
          {twoFactorEnabled ? t("twoFactorOn") : t("twoFactorOff")}
        </Badge>
      </div>
      <p className="m-0 text-sm text-fg-muted">{t("twoFactorDesc")}</p>
      {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}
      {notice ? <p className="m-0 text-sm text-fg-muted">{notice}</p> : null}

      {twoFactorEnabled ? (
        <EnabledPanel
          password={password}
          pending={pending}
          backupCodes={backupCodes}
          onPasswordChange={setPassword}
          onRefreshCodes={refreshBackupCodes}
          onDisable={turnOff}
        />
      ) : (
        <SetupPanel
          step={step}
          password={password}
          totp={totp}
          qr={qr}
          secret={secret}
          pending={pending}
          onPasswordChange={setPassword}
          onTotpChange={setTotp}
          onBegin={beginEnable}
          onScanContinue={() => setStep("verify")}
          onBackToScan={() => {
            setError(null);
            setStep("scan");
          }}
          onCancel={resetSetup}
          onConfirm={confirmTotp}
        />
      )}
    </div>
  );

  if (embedded) {
    return body;
  }

  return (
    <Card staticHover className="gap-4 bg-surface p-6">
      {body}
    </Card>
  );
}

function SetupSteps({ current }: { current: SetupStep }) {
  const t = useTranslations("settings");
  const order: SetupStep[] = ["password", "scan", "verify"];
  const labels: Record<SetupStep, string> = {
    password: t("twoFactorStepPassword"),
    scan: t("twoFactorStepScan"),
    verify: t("twoFactorStepVerify"),
  };
  const currentIndex = order.indexOf(current);

  return (
    <ol className="m-0 flex min-w-0 list-none flex-col gap-2 p-0 sm:flex-row sm:items-center">
      {order.map((id, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={id} className="flex min-w-0 items-center gap-2 sm:min-w-0 sm:flex-1">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                active && "bg-accent text-on-accent",
                done && "bg-accent-surface text-accent-on-surface",
                !active && !done && "bg-surface text-fg-muted",
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Icon name="check" className="text-xs" /> : index + 1}
            </span>
            <span
              className={cn(
                "min-w-0 truncate text-sm",
                active ? "font-medium" : "text-fg-muted",
              )}
            >
              {labels[id]}
            </span>
            {index < order.length - 1 ? (
              <span className="hidden h-px min-w-4 flex-1 bg-border sm:block" aria-hidden="true" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function SetupPanel({
  step,
  password,
  totp,
  qr,
  secret,
  pending,
  onPasswordChange,
  onTotpChange,
  onBegin,
  onScanContinue,
  onBackToScan,
  onCancel,
  onConfirm,
}: {
  step: SetupStep;
  password: string;
  totp: string;
  qr: string | null;
  secret: string | null;
  pending: boolean;
  onPasswordChange: (value: string) => void;
  onTotpChange: (value: string) => void;
  onBegin: () => void;
  onScanContinue: () => void;
  onBackToScan: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations("settings");

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <SetupSteps current={step} />

      {step === "password" ? (
        <>
          <Field label={t("currentPassword")} hint={t("twoFactorPasswordHint")}>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
            />
          </Field>
          <Button
            variant="primary"
            loading={pending}
            disabled={password === ""}
            onClick={onBegin}
          >
            {t("twoFactorShowQr")}
          </Button>
        </>
      ) : null}

      {step === "scan" && qr ? (
        <>
          <p className="m-0 text-sm text-fg-muted">{t("twoFactorScanHint")}</p>
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex size-40 shrink-0 items-center justify-center rounded-default border border-border bg-surface p-2">
              {/* totpuri QR generated locally from Better Auth secret */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt={t("twoFactorQrAlt")} className="size-full" />
            </div>
            {secret ? (
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="text-sm font-medium">{t("twoFactorManualSecret")}</span>
                <code className="break-all rounded-default border border-border bg-surface px-3 py-2 font-mono text-xs">
                  {secret}
                </code>
                <CopyButton value={secret} label={t("twoFactorCopySecret")} />
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={onScanContinue}>
              {t("twoFactorEnterCode")}
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              {t("twoFactorCancel")}
            </Button>
          </div>
        </>
      ) : null}

      {step === "verify" ? (
        <>
          <Field label={t("totpCode")} hint={t("twoFactorCodeHint")}>
            <Input
              value={totp}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              onChange={(event) => onTotpChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              loading={pending}
              disabled={totp.length < 6}
              onClick={onConfirm}
            >
              {t("verify2fa")}
            </Button>
            <Button variant="ghost" onClick={onBackToScan}>
              {t("twoFactorBack")}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function EnabledPanel({
  password,
  pending,
  backupCodes,
  onPasswordChange,
  onRefreshCodes,
  onDisable,
}: {
  password: string;
  pending: boolean;
  backupCodes: string[];
  onPasswordChange: (value: string) => void;
  onRefreshCodes: () => void;
  onDisable: () => void;
}) {
  const t = useTranslations("settings");

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {backupCodes.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-sm font-medium">{t("backupCodes")}</span>
          <p className="m-0 text-sm text-fg-muted">{t("backupCodesHint")}</p>
          <ul className="m-0 grid list-none grid-cols-2 gap-1 p-0 font-mono text-sm">
            {backupCodes.map((code) => (
              <li key={code} className="min-w-0 truncate">
                {code}
              </li>
            ))}
          </ul>
          <CopyButton value={backupCodes.join("\n")} label={t("copyBackupCodes")} />
        </div>
      ) : null}

      <Field label={t("currentPassword")} hint={t("twoFactorManageHint")}>
        <Input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button loading={pending} disabled={password === ""} onClick={onRefreshCodes}>
          {t("generateBackupCodes")}
        </Button>
        <Button
          variant="danger"
          loading={pending}
          disabled={password === ""}
          onClick={onDisable}
        >
          {t("disable2fa")}
        </Button>
      </div>
    </div>
  );
}

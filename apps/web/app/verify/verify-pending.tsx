"use client";

import { Icon } from "@/components/kit/icon";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Input } from "@/components/ui";
import { AuthAlert, AuthHeading } from "../_auth/auth-primitives";
import { changeUnverifiedEmailAction, resendVerificationEmail } from "./actions";

type VerifyPendingProps = {
  email: string;
  inviteId?: string;
};

export function VerifyPending({ email, inviteId = "" }: VerifyPendingProps) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const [remaining, setRemaining] = useState(0);
  const [pending, setPending] = useState(false);
  const [resent, setResent] = useState(false);
  const [changing, setChanging] = useState(false);
  const [changePending, setChangePending] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginHref =
    inviteId === "" ? "/login" : `/login?next=${encodeURIComponent(`/invite/${inviteId}`)}`;

  useEffect(() => {
    if (remaining <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setRemaining((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [remaining]);

  const handleResend = async (): Promise<void> => {
    if (pending || remaining > 0) {
      return;
    }
    setPending(true);
    try {
      const result = await resendVerificationEmail();
      setRemaining(result.remainingSeconds);
      setResent(true);
    } catch {
      setResent(true);
    } finally {
      setPending(false);
    }
  };

  const handleChange = async (): Promise<void> => {
    if (changePending || remaining > 0) {
      return;
    }
    setChangePending(true);
    try {
      const result = await changeUnverifiedEmailAction(newEmail, password);
      setRemaining(result.remainingSeconds);
      setResent(true);
      setChanging(false);
      setPassword("");
      setNewEmail("");
      router.refresh();
    } catch {
      setResent(true);
    } finally {
      setChangePending(false);
    }
  };

  const coolingDown = remaining > 0;
  const resendEnabled = !pending && !coolingDown;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <span
        className="flex size-11 items-center justify-center rounded-default bg-accent-surface text-accent-ink"
        aria-hidden="true"
      >
        <Icon name="envelope-circle-check" className="text-lg" />
      </span>

      <AuthHeading title={t("verifyTitle")} description={t("verifyDescription")} />

      <div className="flex min-w-0 flex-col gap-1.5 rounded-default border border-border bg-surface-subtle px-4 py-3.5">
        <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
          {t("verifySentTo")}
        </span>
        <span className="min-w-0 font-mono text-sm break-all text-ink">{email}</span>
      </div>

      <ol className="m-0 flex list-none flex-col gap-2.5 p-0 text-sm text-fg-muted">
        <li className="flex min-w-0 gap-2.5">
          <span className="shrink-0 font-mono text-xs text-fg-subtle tabular-nums">01</span>
          <span className="min-w-0">{t("verifyStep1")}</span>
        </li>
        <li className="flex min-w-0 gap-2.5">
          <span className="shrink-0 font-mono text-xs text-fg-subtle tabular-nums">02</span>
          <span className="min-w-0">{inviteId === "" ? t("verifyStep2") : t("verifyStep2Invite")}</span>
        </li>
        <li className="flex min-w-0 gap-2.5">
          <span className="shrink-0 font-mono text-xs text-fg-subtle tabular-nums">03</span>
          <span className="min-w-0">{t("verifyStep3")}</span>
        </li>
      </ol>

      <AuthAlert tone="info">{t("verifySpamHint")}</AuthAlert>

      {resent ? <AuthAlert tone="accent">{t("verifyResent")}</AuthAlert> : null}

      {changing ? (
        <form
          className="flex min-w-0 flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleChange();
          }}
        >
          <p className="m-0 text-sm text-fg-muted">{t("verifyChangeHint")}</p>
          <Field label={t("verifyNewEmail")}>
            <Input
              type="email"
              name="new-email"
              autoComplete="email"
              required
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
            />
          </Field>
          <Field label={t("verifyCurrentPassword")}>
            <Input
              type="password"
              name="current-password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" variant="primary" loading={changePending} disabled={coolingDown}>
              {changePending ? t("verifyChanging") : t("verifyChangeSubmit")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setChanging(false);
              }}
            >
              {tc("cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="primary"
            disabled={!resendEnabled}
            loading={pending}
            onClick={() => {
              void handleResend();
            }}
          >
            {pending ? t("verifyResending") : coolingDown ? t("verifyWait", { seconds: remaining }) : t("verifyResend")}
          </Button>
          <Button
            onClick={() => {
              setChanging(true);
              setNewEmail("");
              setPassword("");
            }}
          >
            {t("verifyDifferentEmail")}
          </Button>
          <Button variant="ghost" href={loginHref}>
            {t("verifyBackToSignIn")}
          </Button>
        </div>
      )}
    </div>
  );
}

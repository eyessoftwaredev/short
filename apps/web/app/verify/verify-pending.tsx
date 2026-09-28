"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Input } from "@/components/ui";
import { AuthAlert, AuthHeading, AuthValue } from "../_auth/auth-primitives";
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
      // `ok: false` means the cooldown refused the send; the countdown on the
      // button already says so, and "another email is on its way" would be untrue.
      setResent(result.ok);
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
      <AuthHeading icon="envelope-circle-check" title={t("verifyTitle")} description={t("verifyDescription")} />

      <AuthValue label={t("verifySentTo")} value={email} />

      <ol className="m-0 flex list-none flex-col gap-3 p-0 text-sm text-fg-muted">
        {[t("verifyStep1"), inviteId === "" ? t("verifyStep2") : t("verifyStep2Invite"), t("verifyStep3")].map(
          (step, index) => (
            <li key={step} className="flex min-w-0 items-start gap-3">
              <span className="numeric flex size-6 shrink-0 items-center justify-center rounded-pill bg-surface text-xs font-semibold text-fg-muted">
                {index + 1}
              </span>
              <span className="min-w-0 pt-0.5">{step}</span>
            </li>
          ),
        )}
      </ol>

      {resent ? (
        <AuthAlert tone="accent">{t("verifyResent")}</AuthAlert>
      ) : (
        <AuthAlert tone="info">{t("verifySpamHint")}</AuthAlert>
      )}

      {changing ? (
        <form
          className="flex min-w-0 flex-col gap-4 rounded-lg border border-border p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleChange();
          }}
        >
          <div className="flex min-w-0 flex-col gap-1">
            <p className="m-0 text-sm font-semibold text-ink">{t("verifyChangeTitle")}</p>
            <p className="m-0 text-[13px] text-fg-muted">{t("verifyChangeHint")}</p>
          </div>
          <Field label={t("verifyNewEmail")} info={t("verifyNewEmailInfo")}>
            <Input
              type="email"
              name="new-email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              autoFocus
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
            />
          </Field>
          <Field label={t("verifyCurrentPassword")} info={t("verifyCurrentPasswordInfo")}>
            <Input
              type="password"
              name="current-password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setChanging(false);
              }}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={changePending} disabled={coolingDown}>
              {changePending ? t("verifyChanging") : coolingDown ? t("verifyWait", { seconds: remaining }) : t("verifyChangeSubmit")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-2.5">
          <Button
            variant="primary"
            size="lg"
            block
            leadingIcon={coolingDown ? "clock" : "rotate-right"}
            disabled={!resendEnabled}
            loading={pending}
            onClick={() => {
              void handleResend();
            }}
          >
            {pending ? t("verifyResending") : coolingDown ? t("verifyWait", { seconds: remaining }) : t("verifyResend")}
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              leadingIcon="pen"
              onClick={() => {
                setChanging(true);
                setNewEmail("");
                setPassword("");
              }}
            >
              {t("verifyDifferentEmail")}
            </Button>
            <Button variant="ghost" size="sm" href={loginHref} leadingIcon="arrow-left">
              {t("verifyBackToSignIn")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

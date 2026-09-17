"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Input } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { isTwoFactorRedirect, twoFactorContinueHref } from "@/lib/two-factor";
import { AuthAlert, AuthHeading } from "../../_auth/auth-primitives";
import { PasswordField } from "../../_auth/password-field";
import { verifyEmailFromInviteAction } from "./actions";

const MIN_PASSWORD_LENGTH = 10;

export type InviteView = {
  id: string;
  email: string;
  role: string;
  workspaceId: string;
  workspaceName: string;
  usable: boolean;
  reason: "expired" | "used" | null;
};

export function InviteForm({
  invite,
  sessionEmail,
  accountExists,
}: {
  invite: InviteView;
  sessionEmail: string | null;
  accountExists: boolean;
}) {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const loginHref = `/login?next=${encodeURIComponent(`/invite/${invite.id}`)}`;
  const emailMatches =
    sessionEmail !== null && sessionEmail.toLowerCase() === invite.email.toLowerCase();

  const accept = async (): Promise<boolean> => {
    const result = await authClient.organization.acceptInvitation({ invitationId: invite.id });
    if (result.error) {
      setError(result.error.message ?? t("inviteAcceptFailed"));
      return false;
    }
    try {
      await authClient.organization.setActive({ organizationId: invite.workspaceId });
    } catch {
      // Membership is already written; the switcher still lists the workspace.
    }
    return true;
  };

  const joinSignedIn = async (): Promise<void> => {
    setPending(true);
    setError(null);
    try {
      if (!(await accept())) {
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(te("generic"));
    } finally {
      setPending(false);
    }
  };

  const finishAuth = async (): Promise<boolean> => {
    const verified = await verifyEmailFromInviteAction(invite.id);
    if (!verified.ok) {
      setError(te(verified.error === "invite_invalid" ? "invite_invalid" : "generic"));
      return false;
    }

    const signedIn = await authClient.signIn.email({
      email: invite.email,
      password,
      callbackURL: "/dashboard",
    });
    if (signedIn.error) {
      setError(signedIn.error.message ?? t("inviteAcceptFailed"));
      return false;
    }
    if (isTwoFactorRedirect(signedIn.data)) {
      window.location.assign(twoFactorContinueHref());
      return false;
    }

    return accept();
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t("resetTooShort", { min: MIN_PASSWORD_LENGTH }));
      return;
    }

    setPending(true);
    setError(null);
    try {
      const created = await authClient.signUp.email({
        name,
        email: invite.email,
        password,
      });
      if (created.error) {
        setError(created.error.message ?? t("inviteAcceptFailed"));
        return;
      }
      if (!(await finishAuth())) {
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(te("generic"));
    } finally {
      setPending(false);
    }
  };

  const handleSignIn = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const signedIn = await authClient.signIn.email({
        email: invite.email,
        password,
        callbackURL: "/dashboard",
      });
      if (signedIn.error) {
        const unverified = (signedIn.error.message ?? "").toLowerCase().includes("verif");
        if (!unverified && signedIn.error.status !== 403) {
          setError(signedIn.error.message ?? t("inviteAcceptFailed"));
          return;
        }
      }
      if (isTwoFactorRedirect(signedIn.data)) {
        window.location.assign(twoFactorContinueHref());
        return;
      }
      if (!(await finishAuth())) {
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(te("generic"));
    } finally {
      setPending(false);
    }
  };

  if (!invite.usable) {
    return (
      <>
        <AuthHeading
          title={t("inviteInvalidTitle")}
          description={
            invite.reason === "expired"
              ? t("inviteExpired", { workspace: invite.workspaceName })
              : t("inviteUsed", { workspace: invite.workspaceName })
          }
        />
        <Button href="/login" variant="primary" size="lg" className="w-full">
          {t("signIn")}
        </Button>
      </>
    );
  }

  return (
    <>
      <AuthHeading
        title={t("inviteTitle", { workspace: invite.workspaceName })}
        description={t("inviteDescription", { role: invite.role, email: invite.email })}
      />

      {error ? (
        <AuthAlert tone="danger" title={t("inviteErrorTitle")}>
          {error}
        </AuthAlert>
      ) : null}

      {sessionEmail === null && !accountExists ? (
        <form
          className="flex min-w-0 flex-col gap-4"
          aria-busy={pending}
          onSubmit={(event) => {
            void handleRegister(event);
          }}
        >
          <AuthAlert tone="info">{t("inviteRegisterHint")}</AuthAlert>
          <Field label={t("name")}>
            <Input
              name="name"
              autoComplete="name"
              required
              placeholder={t("namePlaceholder")}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <LockedEmailField email={invite.email} hint={t("inviteLockedEmailHint")} />
          <PasswordField
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            requirements
            invalid={Boolean(error)}
          />
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
            {pending ? t("inviteJoining") : t("inviteCreateAndJoin")}
          </Button>
          <p className="m-0 text-center text-sm text-fg-muted">
            <Link href={loginHref} className="font-medium">
              {t("signInInstead")}
            </Link>
          </p>
        </form>
      ) : null}

      {sessionEmail === null && accountExists ? (
        <form
          className="flex min-w-0 flex-col gap-4"
          aria-busy={pending}
          onSubmit={(event) => {
            void handleSignIn(event);
          }}
        >
          <AuthAlert tone="info">{t("inviteExistsHint")}</AuthAlert>
          <LockedEmailField email={invite.email} hint={t("inviteLockedEmailHint")} />
          <PasswordField
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            invalid={Boolean(error)}
          />
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
            {pending ? t("inviteJoining") : t("inviteSignInAndJoin")}
          </Button>
        </form>
      ) : null}

      {sessionEmail !== null && !emailMatches ? (
        <AuthAlert tone="danger" title={t("inviteWrongAccountTitle")}>
          {t("inviteWrongAccount", { email: invite.email, session: sessionEmail })}
        </AuthAlert>
      ) : null}

      {emailMatches ? (
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={() => {
            void joinSignedIn();
          }}
        >
          {pending ? t("inviteJoining") : t("inviteJoin", { workspace: invite.workspaceName })}
        </Button>
      ) : null}
    </>
  );
}

function LockedEmailField({ email, hint }: { email: string; hint: string }) {
  const t = useTranslations("auth");
  return (
    <Field label={t("email")} hint={hint}>
      <Input
        type="email"
        name="email"
        value={email}
        readOnly
        aria-readonly="true"
        autoComplete="username"
        className="cursor-not-allowed bg-surface-subtle text-fg-muted"
      />
    </Field>
  );
}

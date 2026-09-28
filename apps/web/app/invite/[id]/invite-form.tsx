"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Input } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { isTwoFactorRedirect, twoFactorContinueHref } from "@/lib/two-factor";
import { INVITE_PROOF_HEADER, verifyPendingPath } from "@/lib/verify-path";
import { grantVerifyResend } from "../../verify/actions";
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

function isEmailNotVerified(error: { code?: string; message?: string | null }): boolean {
  if ((error.code ?? "").toUpperCase() === "EMAIL_NOT_VERIFIED") {
    return true;
  }
  return !error.code && (error.message ?? "").toLowerCase().includes("verif");
}

export function InviteForm({
  invite,
  proof,
  sessionEmail,
  accountExists,
}: {
  invite: InviteView;
  /** Inbox proof from the emailed link; empty when the page was opened without it. */
  proof: string;
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
  const invitePath = `/invite/${invite.id}`;
  const emailMatches =
    sessionEmail !== null && sessionEmail.toLowerCase() === invite.email.toLowerCase();
  const roleLabel =
    invite.role === "owner" || invite.role === "admin" || invite.role === "member"
      ? t(`role.${invite.role}`)
      : invite.role;

  /** Signed in as someone else: end that session, then come back to this invite. */
  const switchAccount = async (): Promise<void> => {
    setPending(true);
    try {
      await authClient.signOut();
    } catch {
      // Even if sign-out fails the login screen offers the right account.
    }
    window.location.assign(loginHref);
  };

  const accept = async (): Promise<boolean> => {
    const result = await authClient.organization.acceptInvitation({ invitationId: invite.id });
    if (result.error) {
      setError(
        result.error.message === "quota_members"
          ? te("quota_members")
          : (result.error.message ?? t("inviteAcceptFailed")),
      );
      return false;
    }
    try {
      await authClient.organization.setActive({ organizationId: invite.workspaceId });
    } catch {
      // Membership is already written; the switcher still lists the workspace.
    }
    return true;
  };

  // Full navigation so the fresh session cookie is sent on the very next request.
  const enterPanel = (): void => {
    window.location.assign("/dashboard");
  };

  /** No emailed proof: confirm the address through the regular verification mail. */
  const continueToVerify = async (): Promise<void> => {
    await grantVerifyResend(invite.email, password);
    router.push(verifyPendingPath(invite.id));
  };

  const joinSignedIn = async (): Promise<void> => {
    setPending(true);
    setError(null);
    try {
      if (!(await accept())) {
        return;
      }
      enterPanel();
    } catch {
      setError(te("generic"));
    } finally {
      setPending(false);
    }
  };

  /** Unverified account + emailed proof: verify, sign in, then join. */
  const finishAuth = async (): Promise<boolean> => {
    const verified = await verifyEmailFromInviteAction(invite.id, proof, password);
    if (!verified.ok) {
      setError(
        te(
          verified.error === "invite_invalid" || verified.error === "wrong_password"
            ? verified.error
            : "generic",
        ),
      );
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
      const created = await authClient.signUp.email(
        {
          name,
          email: invite.email,
          password,
          // The verification mail (sent when there is no proof) lands back on this invite.
          callbackURL: invitePath,
        },
        proof === "" ? undefined : { headers: { [INVITE_PROOF_HEADER]: `${invite.id}.${proof}` } },
      );
      if (created.error) {
        setError(created.error.message ?? t("inviteAcceptFailed"));
        return;
      }
      if (proof === "") {
        await continueToVerify();
        return;
      }
      if (!(await finishAuth())) {
        return;
      }
      enterPanel();
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
        if (!isEmailNotVerified(signedIn.error)) {
          setError(signedIn.error.message ?? t("inviteAcceptFailed"));
          return;
        }
        if (proof === "") {
          await continueToVerify();
          return;
        }
        if (!(await finishAuth())) {
          return;
        }
        enterPanel();
        return;
      }
      if (isTwoFactorRedirect(signedIn.data)) {
        window.location.assign(twoFactorContinueHref());
        return;
      }
      if (!(await accept())) {
        return;
      }
      enterPanel();
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
          icon="clock"
          title={t("inviteInvalidTitle")}
          description={
            invite.reason === "expired"
              ? t("inviteExpired", { workspace: invite.workspaceName })
              : t("inviteUsed", { workspace: invite.workspaceName })
          }
        />
        <Button href="/login" variant="primary" size="lg" block>
          {t("signIn")}
        </Button>
      </>
    );
  }

  return (
    <>
      <AuthHeading
        title={t("inviteTitle", { workspace: invite.workspaceName })}
        description={t("inviteDescription", { role: roleLabel, email: invite.email })}
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
              autoFocus
              placeholder={t("namePlaceholder")}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <LockedEmailField email={invite.email} hint={t("inviteLockedEmailHint")} />
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
          <Button type="submit" variant="primary" size="lg" block loading={pending}>
            {pending ? t("inviteJoining") : t("inviteSignInAndJoin")}
          </Button>
        </form>
      ) : null}

      {sessionEmail !== null && !emailMatches ? (
        <>
          <AuthAlert tone="danger" title={t("inviteWrongAccountTitle")}>
            {t("inviteWrongAccount", { email: invite.email, session: sessionEmail })}
          </AuthAlert>
          <Button
            variant="primary"
            size="lg"
            block
            leadingIcon="right-from-bracket"
            loading={pending}
            onClick={() => {
              void switchAccount();
            }}
          >
            {t("inviteSwitchAccount")}
          </Button>
        </>
      ) : null}

      {emailMatches ? (
        <Button
          variant="primary"
          size="lg"
          block
          loading={pending}
          trailingIcon="arrow-right"
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

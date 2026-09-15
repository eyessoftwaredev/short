"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { AuthAlert, AuthHeading } from "../../_auth/auth-shell";

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
}: {
  invite: InviteView;
  sessionEmail: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const next = `/invite/${invite.id}`;
  const loginHref = `/login?next=${encodeURIComponent(next)}`;
  const registerHref = `/register?invite=${encodeURIComponent(invite.id)}`;
  const emailMatches =
    sessionEmail !== null && sessionEmail.toLowerCase() === invite.email.toLowerCase();

  const accept = async (): Promise<void> => {
    setPending(true);
    setError(null);
    try {
      const result = await authClient.organization.acceptInvitation({ invitationId: invite.id });
      if (result.error) {
        setError(result.error.message ?? "Could not accept the invitation");
        return;
      }
      try {
        await authClient.organization.setActive({ organizationId: invite.workspaceId });
      } catch {
        // Membership is already written; the switcher still lists the workspace.
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  };

  if (!invite.usable) {
    return (
      <>
        <AuthHeading
          title="This invite is no longer valid"
          description={
            invite.reason === "expired"
              ? `The invitation to ${invite.workspaceName} has expired. Ask an admin to send a new one.`
              : `The invitation to ${invite.workspaceName} has already been used or cancelled.`
          }
        />
        <Button href="/login" variant="primary" size="lg" className="w-full">
          Sign in
        </Button>
      </>
    );
  }

  return (
    <>
      <AuthHeading
        title={`Join ${invite.workspaceName}`}
        description={`You were invited as ${invite.role} at ${invite.email}.`}
      />

      {error ? (
        <AuthAlert tone="danger" title="Could not join the workspace">
          {error}
        </AuthAlert>
      ) : null}

      {sessionEmail === null ? (
        <>
          <AuthAlert tone="info">
            Sign in with {invite.email}, or create an account on that address, then open this link
            again.
          </AuthAlert>
          <div className="flex min-w-0 flex-col gap-2.5">
            <Button variant="primary" size="lg" className="w-full" href={loginHref}>
              Sign in to accept
            </Button>
            <Button size="lg" className="w-full" href={registerHref}>
              Create an account
            </Button>
          </div>
        </>
      ) : null}

      {sessionEmail !== null && !emailMatches ? (
        <AuthAlert tone="danger" title="Wrong account">
          This invite is for {invite.email}. You are signed in as {sessionEmail}. Switch accounts
          and open the link again.
        </AuthAlert>
      ) : null}

      {emailMatches ? (
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={() => {
            void accept();
          }}
        >
          {pending ? "Joining…" : `Join ${invite.workspaceName}`}
        </Button>
      ) : null}
    </>
  );
}

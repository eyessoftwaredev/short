import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Mail, ShieldCheck, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { getPublicInvite } from "@/lib/team";
import { AuthShell, type AuthHighlight } from "../../_auth/auth-shell";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Workspace invite" };

const HIGHLIGHTS: readonly AuthHighlight[] = [
  {
    id: "seat",
    icon: <Users className="size-4" />,
    title: "A seat on their workspace",
    body: "You will see the same links, QR codes and bio pages as the rest of the team.",
  },
  {
    id: "role",
    icon: <ShieldCheck className="size-4" />,
    title: "Role already chosen",
    body: "The person who invited you picked what you can change. An owner can raise it later.",
  },
  {
    id: "inbox",
    icon: <Mail className="size-4" />,
    title: "Tied to one address",
    body: "Accept with the inbox the invite was sent to — another account cannot claim it.",
  },
];

type Params = Promise<{ id: string }>;

export default async function InvitePage({ params }: { params: Params }) {
  const { id } = await params;
  if (id.trim() === "") {
    notFound();
  }

  const invite = await getPublicInvite(id);
  if (!invite) {
    notFound();
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const expired = invite.expiresAt.getTime() < Date.now();
  const usable = invite.status === "pending" && !expired;

  return (
    <AuthShell
      railTitle="You have been invited."
      railBody={`${invite.workspaceName} wants you on the team. Accept and you are in.`}
      highlights={HIGHLIGHTS}
      crossLink={{ prompt: "Already a member?", label: "Sign in", href: "/login" }}
    >
      <InviteForm
        sessionEmail={session?.user.email ?? null}
        invite={{
          id: invite.id,
          email: invite.email,
          role: invite.role,
          workspaceId: invite.workspaceId,
          workspaceName: invite.workspaceName,
          usable,
          reason: expired ? "expired" : invite.status !== "pending" ? "used" : null,
        }}
      />
    </AuthShell>
  );
}

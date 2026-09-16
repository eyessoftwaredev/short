import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getPublicInvite, isInviteUsable, userExistsByEmail } from "@/lib/team";
import { AuthShell, type AuthHighlight } from "../../_auth/auth-shell";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Workspace invite" };

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

  const [session, t] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getTranslations("auth"),
  ]);
  const expired = invite.expiresAt.getTime() < Date.now();
  const usable = isInviteUsable(invite);
  const accountExists = usable ? await userExistsByEmail(invite.email) : false;

  const highlights: readonly AuthHighlight[] = [
    {
      id: "seat",
      icon: <Icon name="users" className="text-sm" />,
      title: t("inviteHighlightSeatTitle"),
      body: t("inviteHighlightSeatBody"),
    },
    {
      id: "role",
      icon: <Icon name="shield" className="text-sm" />,
      title: t("inviteHighlightRoleTitle"),
      body: t("inviteHighlightRoleBody"),
    },
    {
      id: "inbox",
      icon: <Icon name="envelope" className="text-sm" />,
      title: t("inviteHighlightInboxTitle"),
      body: t("inviteHighlightInboxBody"),
    },
  ];

  return (
    <AuthShell
      railTitle={t("inviteRailTitle")}
      railBody={t("inviteRailBody", { workspace: invite.workspaceName })}
      highlights={highlights}
      crossLink={{
        prompt: t("inviteAlreadyMember"),
        label: t("signIn"),
        href: `/login?next=${encodeURIComponent(`/invite/${invite.id}`)}`,
      }}
    >
      <InviteForm
        sessionEmail={session?.user.email ?? null}
        accountExists={accountExists}
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

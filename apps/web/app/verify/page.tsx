import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getAllowedVerifyEmail } from "@/lib/verify-grant";
import { getSessionContext } from "@/lib/session";
import { verifyPendingPath } from "@/lib/verify-path";
import { AuthShell, type AuthHighlight } from "../_auth/auth-shell";
import { VerifyPending } from "./verify-pending";

export const metadata: Metadata = { title: "Confirm your email" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function VerifyPage({ searchParams }: { searchParams: SearchParams }) {
  const [t, context, raw, allowedEmail] = await Promise.all([
    getTranslations("auth"),
    getSessionContext(),
    searchParams,
    getAllowedVerifyEmail(),
  ]);

  if (context?.user.emailVerified) {
    redirect("/dashboard");
  }

  if (!allowedEmail) {
    redirect("/login");
  }

  const invite = firstParam(raw.invite);
  if (raw.email !== undefined) {
    redirect(verifyPendingPath(invite));
  }

  const highlights: readonly AuthHighlight[] = [
    {
      id: "inbox",
      icon: <Icon name="inbox" className="text-sm" />,
      title: t("verifyHighlightInboxTitle"),
      body: t("verifyHighlightInboxBody"),
    },
    {
      id: "quiet",
      icon: <Icon name="clock" className="text-sm" />,
      title: t("verifyHighlightQuietTitle"),
      body: t("verifyHighlightQuietBody"),
    },
    {
      id: "safe",
      icon: <Icon name="shield" className="text-sm" />,
      title: t("verifyHighlightSafeTitle"),
      body: t("verifyHighlightSafeBody"),
    },
  ];

  return (
    <AuthShell
      railTitle={t("verifyRailTitle")}
      railBody={t("verifyRailBody")}
      highlights={highlights}
      crossLink={{ prompt: t("alreadyHaveAccount"), label: t("signIn"), href: "/login" }}
    >
      <VerifyPending email={allowedEmail} inviteId={invite} />
    </AuthShell>
  );
}

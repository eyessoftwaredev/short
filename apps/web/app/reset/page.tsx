import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthShell, type AuthHighlight } from "../_auth/auth-shell";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "New password" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ResetPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const token = typeof raw.token === "string" ? raw.token : "";
  const t = await getTranslations("auth");

  const highlights: readonly AuthHighlight[] = [
    {
      id: "once",
      icon: <Icon name="key" className="text-sm" />,
      title: t("resetHighlightOnceTitle"),
      body: t("resetHighlightOnceBody"),
    },
    {
      id: "safe",
      icon: <Icon name="shield" className="text-sm" />,
      title: t("resetHighlightSafeTitle"),
      body: t("resetHighlightSafeBody"),
    },
    {
      id: "sign-in",
      icon: <Icon name="unlock" className="text-sm" />,
      title: t("resetHighlightSignInTitle"),
      body: t("resetHighlightSignInBody"),
    },
  ];

  return (
    <AuthShell
      railTitle={t("resetRailTitle")}
      railBody={t("resetRailBody")}
      highlights={highlights}
      crossLink={{ prompt: t("forgotRemembered"), label: t("verifyBackToSignIn"), href: "/login" }}
    >
      <ResetForm token={token} />
    </AuthShell>
  );
}

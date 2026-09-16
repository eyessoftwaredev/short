import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthShell, type AuthHighlight } from "../_auth/auth-shell";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Reset password" };

export default async function ForgotPage() {
  const t = await getTranslations("auth");

  const highlights: readonly AuthHighlight[] = [
    {
      id: "link",
      icon: <Icon name="envelope-circle-check" className="text-sm" />,
      title: t("forgotHighlightLinkTitle"),
      body: t("forgotHighlightLinkBody"),
    },
    {
      id: "safe",
      icon: <Icon name="shield" className="text-sm" />,
      title: t("forgotHighlightSafeTitle"),
      body: t("forgotHighlightSafeBody"),
    },
    {
      id: "quiet",
      icon: <Icon name="key" className="text-sm" />,
      title: t("forgotHighlightQuietTitle"),
      body: t("forgotHighlightQuietBody"),
    },
  ];

  return (
    <AuthShell
      railTitle={t("forgotRailTitle")}
      railBody={t("forgotRailBody")}
      highlights={highlights}
      crossLink={{ prompt: t("forgotRemembered"), label: t("verifyBackToSignIn"), href: "/login" }}
    >
      <ForgotForm />
    </AuthShell>
  );
}

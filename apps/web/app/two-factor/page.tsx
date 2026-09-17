import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthShell, type AuthHighlight } from "../_auth/auth-shell";
import { TwoFactorForm } from "./two-factor-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("twoFactorTitle") };
}

export default async function TwoFactorPage() {
  const t = await getTranslations("auth");

  const highlights: readonly AuthHighlight[] = [
    {
      id: "app",
      icon: <Icon name="shield" className="text-sm" />,
      title: t("twoFactorHighlightAppTitle"),
      body: t("twoFactorHighlightAppBody"),
    },
    {
      id: "backup",
      icon: <Icon name="key" className="text-sm" />,
      title: t("twoFactorHighlightBackupTitle"),
      body: t("twoFactorHighlightBackupBody"),
    },
    {
      id: "trust",
      icon: <Icon name="circle-check" className="text-sm" />,
      title: t("twoFactorHighlightTrustTitle"),
      body: t("twoFactorHighlightTrustBody"),
    },
  ];

  return (
    <AuthShell
      railTitle={t("twoFactorRailTitle")}
      railBody={t("twoFactorRailBody")}
      highlights={highlights}
      crossLink={{ prompt: t("alreadyHaveAccount"), label: t("verifyBackToSignIn"), href: "/login" }}
    >
      <TwoFactorForm />
    </AuthShell>
  );
}

import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirectIfAuthenticated } from "@/lib/session";
import { AuthShell, type AuthHighlight } from "../_auth/auth-shell";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("signIn") };
}

export default async function LoginPage() {
  await redirectIfAuthenticated();
  const t = await getTranslations("auth");

  const highlights: readonly AuthHighlight[] = [
    {
      id: "targeting",
      icon: <Icon name="bullseye" className="text-sm" />,
      title: t("highlightTargetingTitle"),
      body: t("highlightTargetingBody"),
    },
    {
      id: "analytics",
      icon: <Icon name="chart-line" className="text-sm" />,
      title: t("highlightAnalyticsTitle"),
      body: t("highlightAnalyticsBody"),
    },
    {
      id: "domains",
      icon: <Icon name="globe" className="text-sm" />,
      title: t("highlightDomainsTitle"),
      body: t("highlightDomainsBody"),
    },
  ];

  return (
    <AuthShell
      railTitle={t("loginRailTitle")}
      railBody={t("loginRailBody")}
      highlights={highlights}
      crossLink={{ prompt: t("noAccount"), label: t("createOne"), href: "/register" }}
    >
      <LoginForm />
    </AuthShell>
  );
}

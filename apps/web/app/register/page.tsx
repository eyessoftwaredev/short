import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { redirectIfAuthenticated } from "@/lib/session";
import { AuthShell, type AuthHighlight } from "../_auth/auth-shell";
import { RegisterForm } from "./register-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("createAccount") };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const invite = typeof raw.invite === "string" ? raw.invite : "";
  if (invite !== "") {
    redirect(`/invite/${invite}`);
  }

  await redirectIfAuthenticated();
  const t = await getTranslations("auth");
  const loginHref = "/login";

  const highlights: readonly AuthHighlight[] = [
    {
      id: "free",
      icon: <Icon name="sparkles" className="text-sm" />,
      title: t("highlightFreeTitle"),
      body: t("highlightFreeBody"),
    },
    {
      id: "targeting",
      icon: <Icon name="bullseye" className="text-sm" />,
      title: t("highlightTargetingTitle"),
      body: t("highlightTargetingBody"),
    },
    {
      id: "surfaces",
      icon: <Icon name="address-card" className="text-sm" />,
      title: t("highlightSurfacesTitle"),
      body: t("highlightSurfacesBody"),
    },
  ];

  return (
    <AuthShell
      railTitle={t("registerRailTitle")}
      railBody={t("registerRailBody")}
      highlights={highlights}
      crossLink={{ prompt: t("alreadyHaveAccount"), label: t("signIn"), href: loginHref }}
    >
      <RegisterForm inviteId={invite} />
    </AuthShell>
  );
}

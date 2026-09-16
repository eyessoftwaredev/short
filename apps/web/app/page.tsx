import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { HomeLanding } from "@/components/landing/home-landing";
import { getPlatformBrand } from "@/lib/brand";
import { getSessionContext } from "@/lib/session";
import { verifyPendingPath } from "@/lib/verify-path";
import "@/styles/kit/index.css";

export default async function HomePage() {
  const session = await getSessionContext();
  if (session) {
    if (!session.user.emailVerified) {
      redirect(verifyPendingPath());
    }
    redirect("/dashboard");
  }

  const [brand, t] = await Promise.all([getPlatformBrand(), getTranslations("landing")]);

  return <HomeLanding brand={brand} t={t} />;
}

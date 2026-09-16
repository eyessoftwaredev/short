import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { HomeLanding } from "@/components/landing/home-landing";
import { getPlatformBrand } from "@/lib/brand";
import { siteUrl } from "@/lib/env";
import { hostsAreSplit, isSiteSurface } from "@/lib/public-url";
import { getSessionContext } from "@/lib/session";
import { verifyPendingPath } from "@/lib/verify-path";
import "@/styles/kit/index.css";

export default async function HomePage() {
  const [session, headerList] = await Promise.all([getSessionContext(), headers()]);
  const siteSurface = isSiteSurface(headerList);

  if (siteSurface) {
    const [brand, t] = await Promise.all([getPlatformBrand(), getTranslations("landing")]);
    return (
      <HomeLanding
        brand={brand}
        t={t}
        signedIn={Boolean(session?.user.emailVerified)}
      />
    );
  }

  if (session) {
    if (!session.user.emailVerified) {
      redirect(verifyPendingPath());
    }
    redirect("/dashboard");
  }

  if (hostsAreSplit()) {
    redirect(siteUrl());
  }

  const [brand, t] = await Promise.all([getPlatformBrand(), getTranslations("landing")]);
  return <HomeLanding brand={brand} t={t} signedIn={false} />;
}

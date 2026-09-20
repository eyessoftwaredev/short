import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { HomeLanding } from "@/components/landing/home-landing";
import { getPlatformBrand } from "@/lib/brand";
import { getBrandLockupSources } from "@/lib/brand-assets";
import { BrandPreload } from "@/components/brand/brand-preload";
import { siteUrl } from "@/lib/env";
import { hostsAreSplit, isSiteSurface, panelUrl } from "@/lib/public-url";
import { getLandingAuthState, getSessionContext } from "@/lib/session";
import { verifyPendingPath } from "@/lib/verify-path";
import "@/styles/kit/landing-index.css";

function panelOrigin(): string {
  return new URL(panelUrl()).origin;
}

export default async function HomePage() {
  const headerList = await headers();
  const isSite = isSiteSurface(headerList);

  if (isSite) {
    const [signedIn, brand, t, brandSources] = await Promise.all([
      getLandingAuthState(),
      getPlatformBrand(),
      getTranslations("landing"),
      getBrandLockupSources(),
    ]);

    return (
      <>
        <BrandPreload sources={brandSources} />
        <link rel="preconnect" href={panelOrigin()} />
        <link rel="dns-prefetch" href={panelOrigin()} />
        <HomeLanding brand={brand} t={t} signedIn={signedIn} brandSources={brandSources} />
      </>
    );
  }

  const session = await getSessionContext();
  const signedIn = Boolean(session?.user.emailVerified);

  if (hostsAreSplit()) {
    if (session) {
      if (!session.user.emailVerified) {
        redirect(verifyPendingPath());
      }
      redirect("/dashboard");
    }
    redirect(siteUrl());
  }

  const [brand, t, brandSources] = await Promise.all([
    getPlatformBrand(),
    getTranslations("landing"),
    getBrandLockupSources(),
  ]);

  return (
    <>
      <BrandPreload sources={brandSources} />
      <link rel="preconnect" href={panelOrigin()} />
      <link rel="dns-prefetch" href={panelOrigin()} />
      <HomeLanding brand={brand} t={t} signedIn={signedIn} brandSources={brandSources} />
    </>
  );
}

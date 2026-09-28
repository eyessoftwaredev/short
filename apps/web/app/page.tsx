import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { HomeLanding } from "@/components/landing/home-landing";
import { PublicChrome } from "@/components/landing/public-chrome";
import { getPlatformBrand } from "@/lib/brand";
import { getBrandLockupSources } from "@/lib/brand-assets";
import { serverEnv, siteUrl } from "@/lib/env";
import { hostsAreSplit, isSiteSurface, panelUrl } from "@/lib/public-url";
import { getLandingAuthState, getSessionContext } from "@/lib/session";
import { verifyPendingPath } from "@/lib/verify-path";

export async function generateMetadata(): Promise<Metadata> {
  const [brand, t] = await Promise.all([getPlatformBrand(), getTranslations("landing")]);
  const description = t("meta.description");
  return {
    title: { absolute: `${brand.name} · ${t("meta.title")}` },
    description,
    openGraph: { title: `${brand.name} · ${t("meta.title")}`, description, images: ["/api/brand/og"] },
  };
}

async function renderLanding(signedIn: boolean) {
  const brandSources = await getBrandLockupSources();
  const env = serverEnv();
  let siteOrigin: string;
  try {
    siteOrigin = siteUrl();
  } catch {
    siteOrigin = env.APP_URL;
  }

  return (
    <PublicChrome>
      <HomeLanding
        brandSources={brandSources}
        signedIn={signedIn}
        shortHost={env.PLATFORM_SHORT_DOMAIN}
        siteOrigin={siteOrigin}
        apiBase={panelUrl("/api/v1")}
      />
    </PublicChrome>
  );
}

export default async function HomePage() {
  const headerList = await headers();

  // The edge worker proxies the apex marketing host with `x-short-surface: site`.
  if (isSiteSurface(headerList)) {
    return renderLanding(await getLandingAuthState());
  }

  const session = await getSessionContext();

  if (hostsAreSplit()) {
    if (session) {
      if (!session.user.emailVerified) {
        redirect(verifyPendingPath());
      }
      redirect("/dashboard");
    }
    redirect(siteUrl());
  }

  return renderLanding(Boolean(session?.user.emailVerified));
}

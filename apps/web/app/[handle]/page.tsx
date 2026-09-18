import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { GOOGLE_FONT_HREF } from "@short/core";
import { BioPageView } from "@/components/bio/bio-page-view";
import { BioSensitiveGate } from "@/components/bio/bio-sensitive-gate";
import { BioTracker } from "@/components/bio/bio-tracker";
import { getPublishedBiopage, platformHostname } from "@/lib/biopages";
import { getPlatformBrand } from "@/lib/brand";
import { serverEnv } from "@/lib/env";

/**
 * Bio pages are proxied here by the redirect worker on the customer's own hostname, so
 * they are rendered with ISR: cheap to serve, and a publish shows up within a minute.
 */
export const revalidate = 60;
export const dynamicParams = true;

type Params = Promise<{ handle: string }>;

async function requestHostname(): Promise<string> {
  const headerList = await headers();
  // Prefer the worker's host stamp. Traefik rewrites X-Forwarded-Host to the panel.
  const host =
    headerList.get("x-short-host") ??
    headerList.get("x-forwarded-host") ??
    headerList.get("host") ??
    "";
  return host.split(":")[0]?.toLowerCase() ?? "";
}

/** The panel's own hostname must never serve a bio page, or handles could shadow routes. */
function isPanelHost(hostname: string): boolean {
  try {
    return new URL(serverEnv().APP_URL).hostname.toLowerCase() === hostname;
  } catch {
    return false;
  }
}

async function load(handle: string) {
  const headerList = await headers();
  const fromEdge = headerList.get("x-short-surface") === "bio";
  const hostname = await requestHostname();
  if (hostname === "") {
    return null;
  }
  // Locally the panel and the platform short domain are the same host, so rejecting the
  // panel host outright would mean no bio page ever resolves in development. Real routes
  // still win over this catch-all, so only a non-short-domain panel host is refused —
  // unless the edge worker is proxying a published handle.
  if (isPanelHost(hostname) && hostname !== platformHostname() && !fromEdge) {
    return null;
  }
  return getPublishedBiopage(hostname, handle);
}

function viewPage(page: NonNullable<Awaited<ReturnType<typeof load>>>) {
  return {
    id: page.id,
    handle: page.handle,
    displayName: page.displayName,
    bio: page.bio,
    avatarUrl: page.avatarUrl,
    theme: page.theme,
    buttonStyle: page.buttonStyle,
    blocks: page.blocks,
    bgType: page.bgType,
    bgColor: page.bgColor,
    bgGradient: page.bgGradient,
    bgImageUrl: page.bgImageUrl,
    buttonColor: page.buttonColor,
    buttonTextColor: page.buttonTextColor,
    textColor: page.textColor,
    fontFamily: page.fontFamily,
    profileMode: page.profileMode,
    logoUrl: page.logoUrl,
    profileText: page.profileText,
    coverUrl: page.coverUrl,
    adsEnabled: page.adsEnabled,
    adMobileImage: page.adMobileImage,
    adMobileHref: page.adMobileHref,
    adLeftImage: page.adLeftImage,
    adLeftHref: page.adLeftHref,
    adRightImage: page.adRightImage,
    adRightHref: page.adRightHref,
    customCss: page.customCss,
  };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { handle } = await params;
  const page = await load(handle);

  if (!page) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }

  if (page.passwordHash) {
    return { title: page.handle, robots: { index: false, follow: false } };
  }

  const title = page.seoTitle || page.displayName;
  const description = page.seoDescription || page.bio;
  const hostname = await requestHostname();
  const host = hostname || platformHostname();
  const canonical = `https://${host}/${page.handle}`;
  const image = page.ogImageUrl || page.avatarUrl;

  return {
    title,
    description,
    alternates: { canonical },
    robots: page.sensitive ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: "profile",
      url: canonical,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description },
  };
}

export default async function BiopagePage({ params }: { params: Params }) {
  const { handle } = await params;
  const page = await load(handle);

  if (!page) {
    notFound();
  }

  const brand = await getPlatformBrand();
  const appUrl = serverEnv().APP_URL.replace(/\/$/, "");
  const fontHref = page.fontFamily ? GOOGLE_FONT_HREF[page.fontFamily] : undefined;
  const view = (
    <BioPageView
      page={viewPage(page)}
      showBranding={!page.removeBranding}
      branding={{ name: brand.name, href: appUrl }}
      formEndpoint={`${appUrl}/api/bio/leads`}
    />
  );

  return (
    <main className="min-h-screen">
      {fontHref ? (
        // eslint-disable-next-line @next/next/no-page-custom-font -- allowlisted Google fonts only
        <link rel="stylesheet" href={fontHref} />
      ) : null}
      {page.sensitive ? <BioSensitiveGate pageId={page.id}>{view}</BioSensitiveGate> : view}
      <BioTracker biopageId={page.id} endpoint={`${appUrl}/api/bio/track`} />
    </main>
  );
}

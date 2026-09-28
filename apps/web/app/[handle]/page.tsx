import { timingSafeEqual } from "node:crypto";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { FONT_STACKS, GOOGLE_FONT_HREF } from "@short/core";
import { BioPageView } from "@/components/bio/bio-page-view";
import { BioSensitiveGate } from "@/components/bio/bio-sensitive-gate";
import {
  BIO_THEME_BACKGROUNDS,
  bioSurfaceStyle,
  usesThemeBackground,
} from "@/components/bio/bio-style";
import { BioTracker } from "@/components/bio/bio-tracker";
import { getPublishedBiopage, isPlatformBioHost, platformHostname } from "@/lib/biopages";
import { getPlatformBrand } from "@/lib/brand";
import { serverEnv } from "@/lib/env";

/**
 * Bio pages are proxied here by the redirect worker. Render on demand so a
 * publish is visible on the next request instead of a cached 404.
 */
export const dynamic = "force-dynamic";
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

/**
 * The password gate runs in the redirect worker, which then proxies here. Anyone can
 * reach this origin directly (and set `x-short-host`), so a protected page is rendered
 * only for requests that carry the worker's internal token.
 */
async function requestFromEdge(): Promise<boolean> {
  const token = (await headers()).get("x-short-edge-token") ?? "";
  const expected = serverEnv().INTERNAL_TOKEN;
  const left = Buffer.from(token);
  const right = Buffer.from(expected);
  return token !== "" && left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Metadata, viewport and the page body all need the same row; `cache` keeps that to one
 * set of queries per request instead of three.
 */
const load = cache(async (handle: string) => {
  const hostname = await requestHostname();
  if (hostname === "") {
    return null;
  }

  const page = await getPublishedBiopage(hostname, handle);
  if (page) {
    return page;
  }

  // The worker proxies onto APP_URL. Traefik rewrites X-Forwarded-Host to the panel,
  // and an older worker may omit x-short-host, so retry on the public short domain.
  const platform = platformHostname();
  if ((isPanelHost(hostname) || isPlatformBioHost(hostname)) && platform !== hostname) {
    return getPublishedBiopage(platform, handle);
  }
  return null;
});

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

/** Tints the phone's browser bar to match the page, so the page feels full-bleed. */
export async function generateViewport({ params }: { params: Params }): Promise<Viewport> {
  const { handle } = await params;
  const page = await load(handle);
  if (!page) {
    return {};
  }
  const color =
    page.bgType === "color" && page.bgColor ? page.bgColor : BIO_THEME_BACKGROUNDS[page.theme];
  return color ? { themeColor: color } : {};
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

  if (!page || (page.passwordHash && !(await requestFromEdge()))) {
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
    <main className="min-h-dvh">
      {fontHref ? (
        <>
          {/* The font files come from gstatic; opening that connection early saves a round trip. */}
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          {/* eslint-disable-next-line @next/next/no-page-custom-font -- allowlisted Google fonts only */}
          <link rel="stylesheet" href={fontHref} />
        </>
      ) : null}
      {page.sensitive ? (
        <BioSensitiveGate
          pageId={page.id}
          theme={page.theme}
          surfaceStyle={bioSurfaceStyle(page)}
          themedBackground={usesThemeBackground(page)}
          fontFamily={FONT_STACKS[page.fontFamily ?? "sans"]}
        >
          {view}
        </BioSensitiveGate>
      ) : (
        view
      )}
      <BioTracker biopageId={page.id} endpoint={`${appUrl}/api/bio/track`} />
    </main>
  );
}

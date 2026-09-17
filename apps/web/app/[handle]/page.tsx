import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BioPageView } from "@/components/bio/bio-page-view";
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
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
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
  const hostname = await requestHostname();
  if (hostname === "") {
    return null;
  }
  // Locally the panel and the platform short domain are the same host, so rejecting the
  // panel host outright would mean no bio page ever resolves in development. Real routes
  // still win over this catch-all, so only a non-short-domain panel host is refused.
  if (isPanelHost(hostname) && hostname !== platformHostname()) {
    return null;
  }
  return getPublishedBiopage(hostname, handle);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { handle } = await params;
  const page = await load(handle);

  if (!page) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }

  const title = page.seoTitle || page.displayName;
  const description = page.seoDescription || page.bio;
  const hostname = await requestHostname();
  const host = hostname || platformHostname();
  const canonical = `https://${host}/${page.handle}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: "profile",
      url: canonical,
      images: page.avatarUrl ? [{ url: page.avatarUrl }] : undefined,
    },
    twitter: { card: "summary", title, description },
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

  return (
    <main className="min-h-screen">
      <BioPageView
        page={{
          id: page.id,
          handle: page.handle,
          displayName: page.displayName,
          bio: page.bio,
          avatarUrl: page.avatarUrl,
          theme: page.theme,
          buttonStyle: page.buttonStyle,
          blocks: page.blocks,
        }}
        showBranding={!page.removeBranding}
        branding={{ name: brand.name, href: appUrl }}
      />
      <BioTracker
        biopageId={page.id}
        endpoint={`${serverEnv().APP_URL.replace(/\/$/, "")}/api/bio/track`}
      />
    </main>
  );
}

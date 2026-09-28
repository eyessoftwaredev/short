import { IBM_Plex_Mono, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { cookies } from "next/headers";
import { CookieBanner } from "@/components/consent/cookie-banner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { FALLBACK_BRAND, getPlatformBrand } from "@/lib/brand";
import { siteUrl } from "@/lib/env";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

// Inter: the variable face reads cleanly at 13–14px UI sizes and ships the
// latin-ext glyphs Turkish needs (ğ, ş, ı, İ).
const interSans = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

function metadataOrigin(): string {
  try {
    return siteUrl();
  } catch {
    return process.env.APP_URL || "https://short.ky";
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getPlatformBrand();
  const title = brand.name || FALLBACK_BRAND.name;
  const description = brand.tagline ?? FALLBACK_BRAND.tagline ?? "";

  return {
    metadataBase: new URL(metadataOrigin()),
    title: { default: title, template: `%s · ${title}` },
    description,
    icons: {
      icon: "/api/brand/favicon",
    },
    openGraph: {
      title,
      description,
      images: ["/api/brand/og"],
    },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const themeCookie = (await cookies()).get("short-theme")?.value;
  const defaultDark = themeCookie === "dark";

  return (
    <html lang={locale} className={defaultDark ? "dark" : undefined} suppressHydrationWarning>
      <body className={`${interSans.variable} ${plexMono.variable} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider defaultDark={defaultDark}>
            {children}
            <CookieBanner />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

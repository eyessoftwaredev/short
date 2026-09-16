import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { CookieBanner } from "@/components/consent/cookie-banner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { FALLBACK_BRAND, getPlatformBrand } from "@/lib/brand";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getPlatformBrand();
  const title = brand.name || FALLBACK_BRAND.name;
  const description = brand.tagline ?? FALLBACK_BRAND.tagline ?? "";

  return {
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

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${plexSans.variable} ${plexMono.variable} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            {children}
            <CookieBanner />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CookieSettingsButton } from "@/components/consent/cookie-settings-button";
import { getPlatformBrand } from "@/lib/brand";
import { LegalPage } from "../legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return { title: t("cookiesTitle") };
}

const UPDATED = "2026-09-28";

export default async function CookiesPage() {
  const brand = await getPlatformBrand();

  return (
    <LegalPage
      doc="cookies"
      updated={UPDATED}
      intro={
        <p>
          {brand.name} uses cookies and similar storage on the product website and in the signed-in panel.
          Customer bio pages on a custom domain do not show this banner; those pages are the workspace owner’s
          surface.
        </p>
      }
      sections={[
        {
          id: "necessary",
          title: "Necessary",
          body: (
            <p>
              Required to operate the service: session, language, theme, email-verification grant, first-link
              draft, and the cookie-choice record itself. These cannot be switched off. Without them sign-in,
              language and security flows break.
            </p>
          ),
        },
        {
          id: "analytics",
          title: "Analytics",
          body: (
            <p>
              Optional. Used only after you accept them, to understand how the marketing site and panel are used.
              First-party or third-party analytics scripts are gated on this choice.
            </p>
          ),
        },
        {
          id: "marketing",
          title: "Marketing",
          body: (
            <p>
              Optional. Used only after you accept them, for campaign measurement and third-party advertising tags
              on the platform site. They stay unloaded until you allow the category.
            </p>
          ),
        },
        {
          id: "choice",
          title: "Your choice",
          body: (
            <>
              <p>
                The banner lets you accept all cookies, reject non-essential ones, or save a custom mix. You can
                change your choice at any time with the button below or from “Cookie settings” in the site footer.
                Necessary cookies will be set again the next time you use the product.
              </p>
              <p>
                <CookieSettingsButton className="font-medium text-accent-ink hover:text-accent-hover hover:underline" />
              </p>
            </>
          ),
        },
      ]}
    />
  );
}

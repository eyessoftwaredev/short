import type { Metadata } from "next";
import { getPlatformBrand } from "@/lib/brand";
import { LegalH, LegalP, LegalPage } from "../legal-page";

export const metadata: Metadata = { title: "Cookie Policy" };

const UPDATED = "16 September 2026";

export default async function CookiesPage() {
  const brand = await getPlatformBrand();

  return (
    <LegalPage title="Cookie Policy" updated={UPDATED}>
      <LegalP>
        {brand.name} uses cookies and similar storage on the product website and in the signed-in
        panel. Customer bio pages on a custom domain do not show this banner; those pages are
        the workspace owner’s surface.
      </LegalP>
      <LegalH>Necessary</LegalH>
      <LegalP>
        Required to operate the service: session, locale, email-verification grant, first-link
        draft, and the cookie-choice record itself. These cannot be switched off. Without them
        sign-in, language and security flows break.
      </LegalP>
      <LegalH>Analytics</LegalH>
      <LegalP>
        Optional. Used only after you accept them, to understand how the marketing site and
        panel are used. First-party or third-party analytics scripts are gated on this choice.
      </LegalP>
      <LegalH>Marketing</LegalH>
      <LegalP>
        Optional. Used only after you accept them, for campaign measurement and third-party
        advertising tags on the platform site. They stay unloaded until you allow the category.
      </LegalP>
      <LegalH>Your choice</LegalH>
      <LegalP>
        The banner lets you accept all cookies, reject non-essential ones, or save a custom
        mix. You can return to this page and clear site cookies in your browser to see the
        banner again. Necessary cookies will be set again the next time you use the product.
      </LegalP>
    </LegalPage>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getPlatformBrand } from "@/lib/brand";
import { LegalPage } from "../legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return { title: t("privacyTitle") };
}

const UPDATED = "2026-09-16";

export default async function PrivacyPage() {
  const brand = await getPlatformBrand();

  return (
    <LegalPage
      doc="privacy"
      updated={UPDATED}
      intro={
        <p>
          {brand.name} is operated from Dubai, United Arab Emirates. This policy explains what we collect when you
          use the product website, the workspace panel, and public short links or bio pages.
        </p>
      }
      sections={[
        {
          id: "account-data",
          title: "Account data",
          body: (
            <p>
              When you register we store your name, email, a hash of your password, workspace membership, billing
              status, and the settings you save. We use this to run the product, send verification and security
              mail, and process payments through Stripe.
            </p>
          ),
        },
        {
          id: "click-analytics",
          title: "Click analytics",
          body: (
            <p>
              When someone opens a short link or bio page we record the time, destination, referring site, coarse
              geography, device family, browser, client IP address, and a visitor token that rotates daily. Known
              bots are flagged and left out of reports. We do not sell click logs. Workspace members can see
              aggregates and recent events for their own links.
            </p>
          ),
        },
        {
          id: "cookies",
          title: "Cookies",
          body: (
            <p>
              Necessary cookies keep you signed in, remember your language and theme, and store your cookie choice.
              Analytics and marketing cookies are optional and stay off until you allow them. See the{" "}
              <Link href="/cookies">Cookie Policy</Link> for the categories.
            </p>
          ),
        },
        {
          id: "processors",
          title: "Processors",
          body: (
            <p>
              We use infrastructure and vendors to host the app, send email, take payment, and store analytics.
              They process data only on our instructions. Public bio pages may load third-party embeds you choose
              (for example a video); those providers then receive the visitor’s request directly.
            </p>
          ),
        },
        {
          id: "retention",
          title: "Retention and rights",
          body: (
            <p>
              Account data is kept while the workspace is active and for a limited period after deletion to
              complete billing or security reviews. Click history follows the retention on your plan. You can
              request access, correction or deletion of your account by writing to the privacy address in the
              Contact section below.
            </p>
          ),
        },
        {
          id: "transfers",
          title: "International transfers",
          body: (
            <p>
              Data may be processed in the UAE and in regions where our subprocessors operate. We take contractual
              and technical steps to keep it protected in transit and at rest.
            </p>
          ),
        },
      ]}
    />
  );
}

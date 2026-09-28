import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getPlatformBrand } from "@/lib/brand";
import { LegalPage } from "../legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return { title: t("termsTitle") };
}

const UPDATED = "2026-09-16";

export default async function TermsPage() {
  const brand = await getPlatformBrand();

  return (
    <LegalPage
      doc="terms"
      updated={UPDATED}
      intro={
        <p>
          These Terms govern access to {brand.name}, a link-management service operated from Dubai, United Arab
          Emirates. By creating an account or using a short link, QR code or bio page hosted on the service, you
          agree to them.
        </p>
      }
      sections={[
        {
          id: "service",
          title: "The service",
          body: (
            <p>
              {brand.name} lets you create short URLs, QR codes and bio pages, route visitors, and review click
              analytics. Features and limits depend on the plan attached to your account. We may change, suspend
              or discontinue parts of the service with reasonable notice where we can.
            </p>
          ),
        },
        {
          id: "accounts",
          title: "Accounts",
          body: (
            <p>
              You are responsible for the accuracy of the email you register, for keeping your credentials
              secret, and for activity under your workspaces. You must not use the service to distribute malware,
              phishing, or content that is unlawful in the UAE or in the country of the visitor you send there.
            </p>
          ),
        },
        {
          id: "destinations",
          title: "Customer destinations",
          body: (
            <p>
              Links you create point at destinations you control. You remain responsible for those destinations
              and for any personal data you collect after the redirect. We are a processor of click metadata and a
              controller of account data, as described in the <Link href="/privacy">Privacy Policy</Link>.
            </p>
          ),
        },
        {
          id: "fees",
          title: "Fees",
          body: (
            <p>
              Paid plans are billed through Stripe. Taxes may apply. Unused quota does not roll over unless a plan
              says otherwise. Chargebacks or abuse can lead to suspension.
            </p>
          ),
        },
        {
          id: "liability",
          title: "Liability",
          body: (
            <p>
              The service is provided as-is. To the fullest extent allowed by UAE law, {brand.name} is not liable
              for lost profits, lost data, or damages arising from destinations you choose or from downtime.
              Nothing in these Terms limits liability that cannot be limited by law.
            </p>
          ),
        },
        {
          id: "law",
          title: "Governing law",
          body: (
            <p>
              These Terms are governed by the laws of the United Arab Emirates, and the courts of Dubai have
              exclusive jurisdiction, except where a mandatory consumer rule says otherwise.
            </p>
          ),
        },
      ]}
    />
  );
}

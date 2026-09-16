import type { Metadata } from "next";
import { getPlatformBrand } from "@/lib/brand";
import { LegalH, LegalP, LegalPage } from "../legal-page";

export const metadata: Metadata = { title: "Terms of Service" };

const UPDATED = "16 September 2026";

export default async function TermsPage() {
  const brand = await getPlatformBrand();

  return (
    <LegalPage title="Terms of Service" updated={UPDATED}>
      <LegalP>
        These Terms govern access to {brand.name}, a link-management service operated from
        Dubai, United Arab Emirates. By creating an account or using a short link, QR code or
        bio page hosted on the service, you agree to them.
      </LegalP>
      <LegalH>The service</LegalH>
      <LegalP>
        {brand.name} lets you create short URLs, QR codes and bio pages, route visitors, and
        review click analytics. Features and limits depend on the plan attached to your
        workspace. We may change, suspend or discontinue parts of the service with reasonable
        notice where we can.
      </LegalP>
      <LegalH>Accounts</LegalH>
      <LegalP>
        You are responsible for the accuracy of the email you register, for keeping your
        credentials secret, and for activity under your workspace. You must not use the service
        to distribute malware, phishing, or content that is unlawful in the UAE or in the
        country of the visitor you send there.
      </LegalP>
      <LegalH>Customer destinations</LegalH>
      <LegalP>
        Links you create point at destinations you control. You remain responsible for those
        destinations and for any personal data you collect after the redirect. We are a
        processor of click metadata and a controller of account data, as described in the
        Privacy Policy.
      </LegalP>
      <LegalH>Fees</LegalH>
      <LegalP>
        Paid plans are billed through Stripe. Taxes may apply. Unused quota does not roll over
        unless a plan says otherwise. Chargebacks or abuse can lead to suspension.
      </LegalP>
      <LegalH>Liability</LegalH>
      <LegalP>
        The service is provided as-is. To the fullest extent allowed by UAE law, {brand.name}
        is not liable for lost profits, lost data, or damages arising from destinations you
        choose or from downtime. Nothing in these Terms limits liability that cannot be limited
        by law.
      </LegalP>
      <LegalH>Governing law</LegalH>
      <LegalP>
        These Terms are governed by the laws of the United Arab Emirates, and the courts of
        Dubai have exclusive jurisdiction, except where a mandatory consumer rule says
        otherwise.
      </LegalP>
    </LegalPage>
  );
}

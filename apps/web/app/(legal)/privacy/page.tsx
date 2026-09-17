import type { Metadata } from "next";
import { getPlatformBrand } from "@/lib/brand";
import { LegalH, LegalP, LegalPage } from "../legal-page";

export const metadata: Metadata = { title: "Privacy Policy" };

const UPDATED = "16 September 2026";

export default async function PrivacyPage() {
  const brand = await getPlatformBrand();

  return (
    <LegalPage title="Privacy Policy" updated={UPDATED}>
      <LegalP>
        {brand.name} is operated from Dubai, United Arab Emirates. This policy explains what we
        collect when you use the product website, the workspace panel, and public short links
        or bio pages.
      </LegalP>
      <LegalH>Account data</LegalH>
      <LegalP>
        When you register we store your name, email, password hash or Google identity, workspace
        membership, billing status, and the settings you save. We use this to run the product,
        send verification and security mail, and process payments through Stripe.
      </LegalP>
      <LegalH>Click analytics</LegalH>
      <LegalP>
        When someone opens a short link or bio page we record the time, destination, referring
        site, coarse geography, device family, browser, client IP address, and a rotating
        visitor token. Bot traffic is filtered. We do not sell click logs. Workspace owners
        can see aggregates and recent events for their own links.
      </LegalP>
      <LegalH>Cookies</LegalH>
      <LegalP>
        Necessary cookies keep you signed in, remember your language, and store this cookie
        choice. Analytics and marketing cookies are optional and stay off until you allow them.
        See the Cookie Policy for categories.
      </LegalP>
      <LegalH>Processors</LegalH>
      <LegalP>
        We use infrastructure and vendors to host the app, send email, take payment, and store
        analytics. They process data only on our instructions. Public bio pages may load
        third-party embeds you choose (for example a video); those providers then receive the
        visitor’s request directly.
      </LegalP>
      <LegalH>Retention and rights</LegalH>
      <LegalP>
        Account data is kept while the workspace is active and for a limited period after
        deletion to complete billing or security reviews. Click history follows the retention
        on your plan. You can request access, correction or deletion of your account by
        contacting the address on your workspace receipt or the operator of this deployment.
      </LegalP>
      <LegalH>International transfers</LegalH>
      <LegalP>
        Data may be processed in the UAE and in regions where our subprocessors operate. We
        take contractual and technical steps to keep it protected in transit and at rest.
      </LegalP>
    </LegalPage>
  );
}

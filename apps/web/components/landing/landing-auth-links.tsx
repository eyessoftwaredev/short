import { panelUrl } from "@/lib/public-url";
import type { getTranslations } from "next-intl/server";

type LandingT = Awaited<ReturnType<typeof getTranslations<"landing">>>;

type LandingAuthLinksProps = {
  t: LandingT;
  signedIn: boolean;
};

export function LandingAuthLinks({ t, signedIn }: LandingAuthLinksProps) {
  if (signedIn) {
    return (
      <a className="kit-btn kit-btn--primary" href={panelUrl("/dashboard")}>
        {t("openPanel")}
      </a>
    );
  }

  return (
    <>
      <a className="kit-btn kit-btn--ghost" href={panelUrl("/login")}>
        {t("ctaSecondary")}
      </a>
      <a className="kit-btn kit-btn--primary hidden sm:inline-flex" href={panelUrl("/register")}>
        {t("ctaStart")}
      </a>
    </>
  );
}

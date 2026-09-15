import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { BarChart3, Contact, Globe, QrCode, Target } from "lucide-react";
import { Button, Card, Footer, Grid, Hero, Section } from "@/components/ui";
import { getSessionContext } from "@/lib/session";

function deploymentBrand(): { name: string; tagline: string } {
  return {
    name: process.env.PLATFORM_BRAND_NAME?.trim() || "Short",
    tagline: process.env.PLATFORM_TAGLINE?.trim() || "Short links, QR codes and bio pages",
  };
}

export default async function HomePage() {
  const session = await getSessionContext();
  if (session) {
    redirect("/dashboard");
  }

  const brand = deploymentBrand();
  const t = await getTranslations("landing");

  const features = [
    {
      id: "targeting",
      icon: <Target className="size-4" />,
      title: t("featureTargetingTitle"),
      body: t("featureTargetingBody"),
    },
    {
      id: "analytics",
      icon: <BarChart3 className="size-4" />,
      title: t("featureAnalyticsTitle"),
      body: t("featureAnalyticsBody"),
    },
    {
      id: "qr",
      icon: <QrCode className="size-4" />,
      title: t("featureQrTitle"),
      body: t("featureQrBody"),
    },
    {
      id: "bio",
      icon: <Contact className="size-4" />,
      title: t("featureBioTitle"),
      body: t("featureBioBody"),
    },
    {
      id: "domain",
      icon: <Globe className="size-4" />,
      title: t("featureDomainTitle"),
      body: t("featureDomainBody"),
    },
  ] as const;

  const steps = [
    { id: "create", title: t("stepCreateTitle"), body: t("stepCreateBody") },
    { id: "share", title: t("stepShareTitle"), body: t("stepShareBody") },
    { id: "measure", title: t("stepMeasureTitle"), body: t("stepMeasureBody") },
  ] as const;

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-bg">
      <header className="flex min-w-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
        <Link href="/" className="truncate text-base font-semibold tracking-tight text-ink no-underline hover:no-underline">
          {brand.name}
        </Link>
        <div className="flex min-w-0 items-center gap-3">
          <Button href="/login">{t("ctaSecondary")}</Button>
          <Button variant="primary" href="/register">
            {t("ctaPrimary")}
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl min-w-0 flex-1 flex-col gap-10 px-6 py-12">
        <Hero
          variant="inverse"
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
          actions={
            <>
              <Button variant="primary" href="/register">
                {t("ctaPrimary")}
              </Button>
              <Button href="/login">{t("ctaSecondary")}</Button>
            </>
          }
        />

        <Section title={t("howTitle")} description={t("howDescription")}>
          <Grid columns={3}>
            {steps.map((step, index) => (
              <Card key={step.id} label={`${index + 1}. ${step.title}`}>
                <p className="m-0 text-sm leading-relaxed text-fg-muted">{step.body}</p>
              </Card>
            ))}
          </Grid>
        </Section>

        <Section title={brand.name} description={brand.tagline}>
          <Grid columns={3}>
            {features.map((feature) => (
              <Card key={feature.id} icon={feature.icon} label={feature.title}>
                <p className="m-0 text-sm leading-relaxed text-fg-muted">{feature.body}</p>
              </Card>
            ))}
          </Grid>
        </Section>
      </main>

      <Footer>
        <span>
          © {new Date().getFullYear()} {brand.name}
        </span>
        <span>{t("footerRights")}</span>
      </Footer>
    </div>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PanelShell } from "@/components/shell/panel-shell";
import { StatusBadge } from "@/components/shell/status-badge";
import { Hero } from "@/components/ui";
import { emptyBioForm, toFormDate, type BioFormValues } from "@/lib/bio-form";
import { bioUrl, getBiopage } from "@/lib/biopages";
import { serverEnv } from "@/lib/env";
import { listWorkspaceDomains } from "@/lib/links";
import { requireWorkspace } from "@/lib/session";
import { BioBuilder } from "../../bio-builder";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("bio");
  return { title: t("editTitle") };
}

type Params = Promise<{ id: string }>;

export default async function EditBioPage({ params }: { params: Params }) {
  const [context, t] = await Promise.all([requireWorkspace(), getTranslations("bio")]);
  const { id } = await params;

  const [page, domains] = await Promise.all([
    getBiopage(context.workspace.id, id),
    listWorkspaceDomains(context.workspace.id),
  ]);

  if (!page) {
    notFound();
  }

  const defaults: BioFormValues = {
    ...emptyBioForm(page.handle),
    handle: page.handle,
    domainId: page.domainId ?? "",
    displayName: page.displayName,
    bio: page.bio,
    avatarUrl: page.avatarUrl ?? "",
    theme: page.theme,
    buttonStyle: page.buttonStyle as BioFormValues["buttonStyle"],
    templateId: page.templateId,
    bgType: page.bgType,
    bgColor: page.bgColor ?? "",
    bgGradient: page.bgGradient ?? "",
    bgImageUrl: page.bgImageUrl ?? "",
    buttonColor: page.buttonColor ?? "",
    buttonTextColor: page.buttonTextColor ?? "",
    textColor: page.textColor ?? "",
    fontFamily: page.fontFamily,
    profileMode: page.profileMode,
    logoUrl: page.logoUrl ?? "",
    profileText: page.profileText,
    coverUrl: page.coverUrl ?? "",
    ogImageUrl: page.ogImageUrl ?? "",
    adsEnabled: page.adsEnabled,
    adMobileImage: page.adMobileImage ?? "",
    adMobileHref: page.adMobileHref ?? "",
    adLeftImage: page.adLeftImage ?? "",
    adLeftHref: page.adLeftHref ?? "",
    adRightImage: page.adRightImage ?? "",
    adRightHref: page.adRightHref ?? "",
    customCss: page.customCss,
    sensitive: page.sensitive,
    hasPassword: Boolean(page.passwordHash),
    publishAt: toFormDate(page.publishAt),
    unpublishAt: toFormDate(page.unpublishAt),
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    published: page.published,
    blocks: page.blocks,
  };

  return (
    <PanelShell
      title={page.displayName}
      crumbs={[{ label: context.workspace.name }, { label: t("title"), href: "/bio" }]}
      topbarActions={<StatusBadge status={page.published ? "published" : "draft"} />}
    >
      <Hero
        variant="compact"
        eyebrow={t("builder")}
        title={page.displayName}
        description={bioUrl(page.hostname, page.handle)}
      />
      <BioBuilder
        mode="edit"
        biopageId={page.id}
        defaultValues={defaults}
        domains={domains
          .filter((domain) => !domain.isPlatform)
          .map((domain) => ({ id: domain.id, hostname: domain.hostname }))}
        platformHostname={serverEnv().PLATFORM_SHORT_DOMAIN}
        canCustomCss={context.plan.features.customCss}
        canForms={context.plan.features.bioForms}
      />
    </PanelShell>
  );
}

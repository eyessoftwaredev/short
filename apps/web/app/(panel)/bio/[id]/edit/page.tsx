import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PanelShell } from "@/components/shell/panel-shell";
import { emptyBioForm, toFormDate, type BioFormValues } from "@/lib/bio-form";
import { getBiopage, platformHostname } from "@/lib/biopages";
import { listWorkspaceDomains } from "@/lib/links";
import { requireWorkspace } from "@/lib/session";
import { BioBuilder, type TabId } from "../../bio-builder";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("bio");
  return { title: t("editTitle") };
}

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TABS: readonly TabId[] = ["content", "profile", "design", "settings"];

export default async function EditBioPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [context, t] = await Promise.all([requireWorkspace(), getTranslations("bio")]);
  const [{ id }, raw] = await Promise.all([params, searchParams]);

  const [page, domains] = await Promise.all([
    getBiopage(context.workspace.id, id),
    listWorkspaceDomains(context.workspace.id),
  ]);

  if (!page) {
    notFound();
  }

  const tabParam = Array.isArray(raw.tab) ? raw.tab[0] : raw.tab;
  const initialTab = TABS.find((tab) => tab === tabParam) ?? "content";

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
    >
      <BioBuilder
        biopageId={page.id}
        defaultValues={defaults}
        initialTab={initialTab}
        welcome={raw.welcome === "1"}
        domains={domains
          .filter((domain) => !domain.isPlatform)
          .map((domain) => ({
            id: domain.id,
            hostname: domain.hostname,
            ready: domain.status === "active",
          }))}
        platformHostname={platformHostname()}
        canCustomCss={context.plan.features.customCss}
        canForms={context.plan.features.bioForms}
        canPassword={context.plan.features.passwordProtection}
      />
    </PanelShell>
  );
}

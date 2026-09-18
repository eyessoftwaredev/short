import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { slugify } from "@short/core";
import { PanelShell } from "@/components/shell/panel-shell";
import { Hero } from "@/components/ui";
import { emptyBioForm } from "@/lib/bio-form";
import { serverEnv } from "@/lib/env";
import { listWorkspaceDomains } from "@/lib/links";
import { requireWorkspace } from "@/lib/session";
import { BioBuilder } from "../bio-builder";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("bio");
  return { title: t("newTitle") };
}

export default async function NewBioPage() {
  const [context, t] = await Promise.all([requireWorkspace(), getTranslations("bio")]);
  const domains = await listWorkspaceDomains(context.workspace.id);

  const defaults = emptyBioForm(slugify(context.workspace.name));
  defaults.displayName = context.workspace.name;

  return (
    <PanelShell
      title={t("newTitle")}
      crumbs={[{ label: context.workspace.name }, { label: t("title"), href: "/bio" }]}
    >
      <Hero variant="compact" eyebrow={t("builder")} title={t("createTitle")} description={t("createDesc")} />
      <BioBuilder
        mode="create"
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
